import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException

from api.core.security import require_admin
from api.core.supabase_client import get_supabase
from api.models.schemas import ResidentCreate, ResidentUpdate, ResidentOut, MessageOut, ApartmentAssign

router = APIRouter(prefix="/residents", tags=["residents"])

# Placeholder-email dla mieszkańców „bez konta" — nigdy nie dostarczalny,
# nieużywany do logowania (auth user jest dodatkowo banowany).
_PLACEHOLDER_EMAIL_DOMAIN = "no-login.wmgabi.local"
# ~100 lat; Supabase GoTrue akceptuje godziny/minuty w formacie `<N>h`
_LONG_BAN_DURATION = "876000h"


def _make_placeholder_email() -> str:
    return f"no-login-{uuid.uuid4().hex}@{_PLACEHOLDER_EMAIL_DOMAIN}"


def _make_random_password() -> str:
    # 32 znaki URL-safe base64 — spełnia wymagania siły hasła
    return secrets.token_urlsafe(32) + "Aa1"


@router.get("", response_model=list[ResidentOut])
def list_residents(_admin: dict = Depends(require_admin)):
    """List all residents (admin only)."""
    sb = get_supabase()
    result = sb.table("residents").select("*").order("full_name").execute()
    return result.data


@router.post("", response_model=ResidentOut, status_code=201)
def create_resident(body: ResidentCreate, _admin: dict = Depends(require_admin)):
    """Create a new resident record (admin only).

    Dwa tryby:
    - z kontem: body.email + body.password → pełny auth user + login.
    - bez konta: brak email/password → placeholder auth user (email wewnętrzny,
      losowe hasło, ban na 100 lat), has_account=false, residents.email=NULL.
      Mieszkaniec istnieje w bazie (np. do głosów z zebrania) ale nie może się zalogować.
    """
    sb = get_supabase()

    has_account = bool(body.email)
    auth_email = body.email if has_account else _make_placeholder_email()
    auth_password = body.password if has_account else _make_random_password()

    # 1. Create auth user via Supabase Admin API
    try:
        create_payload: dict = {
            "email": auth_email,
            "password": auth_password,
            "email_confirm": True,  # auto-confirm so user can log in immediately
            "user_metadata": {"full_name": body.full_name},
        }
        if not has_account:
            # Ban na ~100 lat — user nie zaloguje się nigdy, nawet gdyby ktoś poznał placeholder-email.
            create_payload["ban_duration"] = _LONG_BAN_DURATION
        auth_response = sb.auth.admin.create_user(create_payload)
    except Exception as e:
        # Wyciągnij szczegóły błędu
        detail = str(e)
        if hasattr(e, 'message'):
            detail = e.message
        if hasattr(e, 'args') and e.args:
            detail = str(e.args)
        raise HTTPException(status_code=400, detail=f"Błąd tworzenia użytkownika: {detail}")

    user = auth_response.user
    if not user:
        raise HTTPException(status_code=500, detail="Nie udało się utworzyć użytkownika")

    # 2. Insert into residents table
    resident_data = {
        "id": user.id,
        "email": body.email if has_account else None,
        "full_name": body.full_name,
        "apartment_number": body.apartment_number,
        "role": body.role,
        "is_active": True,
        "has_account": has_account,
    }

    try:
        result = sb.table("residents").insert(resident_data).execute()
    except Exception as e:
        # Rollback: delete the auth user if residents insert fails
        sb.auth.admin.delete_user(user.id)
        raise HTTPException(
            status_code=500,
            detail=f"Błąd tworzenia rekordu mieszkańca: {e}",
        )

    # Sync apartments.owner_resident_id
    if body.apartment_number:
        apt = sb.table("apartments").select("id").eq("number", body.apartment_number).execute()
        if apt.data:
            sb.table("apartments").update({"owner_resident_id": user.id}).eq("id", apt.data[0]["id"]).execute()

    return result.data[0]


@router.patch("/{resident_id}", response_model=ResidentOut)
def update_resident(
    resident_id: str,
    body: ResidentUpdate,
    _admin: dict = Depends(require_admin),
):
    """Update resident data (admin only).

    Podanie `email` + `password` dla mieszkańca bez konta „nadaje mu konto":
    aktualizujemy auth.users.email, ustawiamy hasło, zdejmujemy ban i zapisujemy
    residents.email + has_account=true.
    """
    sb = get_supabase()

    grant_account = bool(body.email and body.password)

    # Przygotuj dane do aktualizacji tabeli residents
    update_data = body.model_dump(exclude_none=True)
    # Hasło nie jest kolumną w residents — zostaje po stronie auth
    update_data.pop("password", None)

    if not update_data:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji")

    # Sprawdź czy mieszkaniec istnieje + ustal obecny stan has_account
    existing_res = (
        sb.table("residents")
        .select("id, has_account")
        .eq("id", resident_id)
        .execute()
    )
    if not existing_res.data:
        raise HTTPException(status_code=404, detail="Mieszkaniec nie znaleziony")
    currently_has_account = bool(existing_res.data[0].get("has_account", True))

    if grant_account:
        if currently_has_account:
            raise HTTPException(
                status_code=400,
                detail="Mieszkaniec ma już konto — zmiana emaila/hasła przez ten endpoint niedozwolona.",
            )
        # Zaktualizuj auth usera: email + password + usunięcie bana
        try:
            sb.auth.admin.update_user_by_id(
                resident_id,
                {
                    "email": body.email,
                    "password": body.password,
                    "email_confirm": True,
                    "ban_duration": "none",
                },
            )
        except Exception as e:
            detail = str(e)
            if hasattr(e, "message"):
                detail = e.message
            raise HTTPException(
                status_code=400,
                detail=f"Błąd aktywacji konta: {detail}",
            )
        update_data["has_account"] = True
        # email już jest w update_data z body.model_dump
    else:
        # Nie pozwalaj zmieniać samego emaila bez hasła (ani bez pełnej procedury)
        update_data.pop("email", None)

    if not update_data:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji")

    result = (
        sb.table("residents")
        .update(update_data)
        .eq("id", resident_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Mieszkaniec nie znaleziony")

    # Sync apartments.owner_resident_id when apartment_number changes
    if body.apartment_number is not None:
        # Clear previous assignment for this resident
        sb.table("apartments").update({"owner_resident_id": None}).eq("owner_resident_id", resident_id).execute()

        if body.apartment_number:
            apt = sb.table("apartments").select("id").eq("number", body.apartment_number).execute()
            if apt.data:
                sb.table("apartments").update({"owner_resident_id": resident_id}).eq("id", apt.data[0]["id"]).execute()

    return result.data[0]


@router.delete("/{resident_id}", response_model=MessageOut)
def delete_resident(resident_id: str, _admin: dict = Depends(require_admin)):
    """Delete auth user and resident record (admin only).

    This permanently removes the user from both auth.users and residents table.
    """
    sb = get_supabase()

    # Check if resident exists
    check = sb.table("residents").select("id, email").eq("id", resident_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Mieszkaniec nie znaleziony")

    # 1. Clear apartment assignment
    sb.table("apartments").update({"owner_resident_id": None}).eq("owner_resident_id", resident_id).execute()

    # 2. Delete from residents table
    sb.table("residents").delete().eq("id", resident_id).execute()

    # 3. Delete auth user
    try:
        sb.auth.admin.delete_user(resident_id)
    except Exception:
        # Auth user may have already been deleted — that's fine
        pass

    return {"detail": "Mieszkaniec został usunięty"}


@router.post("/{resident_id}/apartments", response_model=MessageOut, status_code=201)
def assign_apartment(
    resident_id: str,
    body: ApartmentAssign,
    _admin: dict = Depends(require_admin),
):
    """Assign apartment to existing resident (owner_resident_id)."""
    sb = get_supabase()

    res = sb.table("residents").select("id").eq("id", resident_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Mieszkaniec nie znaleziony")

    apt = sb.table("apartments").select("id, number, owner_resident_id").eq("id", body.apartment_id).execute()
    if not apt.data:
        raise HTTPException(status_code=404, detail="Lokal nie znaleziony")

    current_owner = apt.data[0].get("owner_resident_id")
    if current_owner and current_owner != resident_id:
        raise HTTPException(status_code=409, detail="Lokal ma już przypisanego właściciela")

    sb.table("apartments").update({"owner_resident_id": resident_id}).eq("id", body.apartment_id).execute()
    return {"detail": f"Lokal {apt.data[0]['number']} przypisany"}


@router.delete("/{resident_id}/apartments/{apartment_id}", response_model=MessageOut)
def unassign_apartment(
    resident_id: str,
    apartment_id: str,
    _admin: dict = Depends(require_admin),
):
    """Remove apartment ownership from resident."""
    sb = get_supabase()

    apt = sb.table("apartments").select("id, owner_resident_id").eq("id", apartment_id).execute()
    if not apt.data:
        raise HTTPException(status_code=404, detail="Lokal nie znaleziony")
    if apt.data[0].get("owner_resident_id") != resident_id:
        raise HTTPException(status_code=409, detail="Ten lokal nie należy do wskazanego mieszkańca")

    sb.table("apartments").update({"owner_resident_id": None}).eq("id", apartment_id).execute()
    return {"detail": "Lokal odpięty"}
