import logging
import secrets
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException

from api.core.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
from api.core.security import require_admin
from api.core.supabase_client import get_supabase
from api.models.schemas import (
    ApartmentAssign,
    MessageOut,
    PasswordResetOut,
    ResidentCreate,
    ResidentEmailUpdate,
    ResidentOut,
    ResidentUpdate,
)

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


# Bez znaków łatwych do pomylenia: 0/O, 1/l/I — admin dyktuje hasło głosem/SMS.
_PWD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
_PWD_LOWER = "abcdefghijkmnpqrstuvwxyz"
_PWD_DIGIT = "23456789"


_logger = logging.getLogger(__name__)


def _global_sign_out(user_id: str) -> None:
    """Wymuś wylogowanie ze wszystkich urządzeń.

    SDK `auth.admin.sign_out` wymaga JWT mieszkańca, którego admin nie ma —
    używamy bezpośrednio REST: `POST /auth/v1/admin/users/{user_id}/logout`
    z service_role key. Błąd nie blokuje operacji (np. zmiany hasła) — token
    sesji wygaśnie naturalnie po ~1h, ale logujemy ostrzeżenie.
    """
    url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}/logout"
    try:
        resp = httpx.post(
            url,
            params={"scope": "global"},
            headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
            },
            timeout=5.0,
        )
        if resp.status_code >= 400:
            _logger.warning(
                "Global sign-out failed for user %s: HTTP %s %s",
                user_id, resp.status_code, resp.text[:200],
            )
    except Exception as e:  # noqa: BLE001 — best-effort, nie blokujemy operacji
        _logger.warning("Global sign-out error for user %s: %s", user_id, e)


def _make_user_friendly_password(length: int = 12) -> str:
    """Hasło 12 znaków, mieszane (A-Z + a-z + cyfry), bez znaków mylących.

    Spełnia walidację siły (min 8, wielka/mała litera, cyfra) — patrz
    `_validate_password_strength` w `api/models/schemas.py`.
    """
    rng = secrets.SystemRandom()
    chars = [
        rng.choice(_PWD_UPPER),
        rng.choice(_PWD_LOWER),
        rng.choice(_PWD_DIGIT),
    ]
    pool = _PWD_UPPER + _PWD_LOWER + _PWD_DIGIT
    chars += [rng.choice(pool) for _ in range(max(0, length - 3))]
    rng.shuffle(chars)
    return "".join(chars)


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


@router.patch("/{resident_id}/email", response_model=ResidentOut)
def change_resident_email(
    resident_id: str,
    body: ResidentEmailUpdate,
    _admin: dict = Depends(require_admin),
):
    """Zmiana adresu email mieszkańca z kontem (admin).

    Aktualizuje `auth.users.email` (z `email_confirm=True`) oraz `residents.email`.
    Dla mieszkańca bez konta (has_account=false) — błąd 400 (użyj PATCH głównego
    z email + password, by nadać konto).
    """
    sb = get_supabase()

    existing = (
        sb.table("residents")
        .select("*")
        .eq("id", resident_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Mieszkaniec nie znaleziony")

    current = existing.data[0]
    if not current.get("has_account", True):
        raise HTTPException(
            status_code=400,
            detail="Mieszkaniec nie ma konta — najpierw nadaj konto (email + hasło).",
        )

    old_email = current.get("email")
    new_email = body.email
    # Supabase Auth normalizuje email do lowercase — porównujemy case-insensitive,
    # żeby drobne różnice (np. wielkość liter) nie blokowały i nie tworzyły fałszywego audytu.
    norm_old = (old_email or "").strip().lower()
    norm_new = new_email.strip().lower()
    if norm_old == norm_new:
        # No-op: email jest już ustawiony. Zwracamy aktualny wiersz (idempotentnie),
        # bez aktualizacji auth, audit logu i wymuszonego wylogowania — nic się nie zmienia.
        return current

    try:
        sb.auth.admin.update_user_by_id(
            resident_id,
            {"email": new_email, "email_confirm": True},
        )
    except Exception as e:
        detail = str(e)
        if hasattr(e, "message"):
            detail = e.message
        raise HTTPException(status_code=400, detail=f"Błąd zmiany emaila: {detail}")

    result = (
        sb.table("residents")
        .update({"email": new_email})
        .eq("id", resident_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Mieszkaniec nie znaleziony")

    # Audit log to wymóg RODO, ale gdy pisanie do audit_log się nie powiedzie
    # (np. brak migracji 026 z rozszerzonym CHECK na `action`), nie chcemy
    # zwracać 500 — email jest już zmieniony w auth + tabeli `residents`.
    # Logujemy ostrzeżenie i kontynuujemy, by UI nie pokazywał błędu „udanej" operacji.
    try:
        sb.table("audit_log").insert({
            "user_id": _admin["sub"],
            "action": "auth_email_change",
            "table_name": "residents",
            "record_id": resident_id,
            "old_data": {"email": old_email},
            "new_data": {"email": new_email},
        }).execute()
    except Exception as e:  # noqa: BLE001
        _logger.warning("Audit log insert failed for auth_email_change (%s): %s", resident_id, e)

    # Mieszkaniec musi zalogować się nowym emailem — zamykamy aktywne sesje.
    _global_sign_out(resident_id)

    return result.data[0]


@router.post("/{resident_id}/reset-password", response_model=PasswordResetOut)
def reset_resident_password(
    resident_id: str,
    _admin: dict = Depends(require_admin),
):
    """Wygenerowanie nowego losowego hasła dla mieszkańca z kontem (admin).

    Hasło 12 znaków, bez znaków mylących, zwracane jednokrotnie w odpowiedzi —
    admin przekazuje je mieszkańcowi (system nie powiadamia mailem). Audit log
    zawiera tylko fakt zmiany, nigdy samo hasło.
    """
    sb = get_supabase()

    existing = (
        sb.table("residents")
        .select("id, has_account")
        .eq("id", resident_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Mieszkaniec nie znaleziony")
    if not existing.data[0].get("has_account", True):
        raise HTTPException(
            status_code=400,
            detail="Mieszkaniec nie ma konta — reset hasła niedostępny.",
        )

    new_password = _make_user_friendly_password()

    try:
        sb.auth.admin.update_user_by_id(
            resident_id,
            {"password": new_password},
        )
    except Exception as e:
        detail = str(e)
        if hasattr(e, "message"):
            detail = e.message
        raise HTTPException(status_code=400, detail=f"Błąd resetu hasła: {detail}")

    # Hasło już zmienione w auth.users — błąd audit logu (np. brak migracji 026
    # rozszerzającej CHECK constraint o 'auth_password_reset') nie może zwrócić
    # 500, bo admin zobaczyłby błąd, mimo że hasło faktycznie zostało zresetowane.
    try:
        sb.table("audit_log").insert({
            "user_id": _admin["sub"],
            "action": "auth_password_reset",
            "table_name": "residents",
            "record_id": resident_id,
            "new_data": {"reset": True},
        }).execute()
    except Exception as e:  # noqa: BLE001
        _logger.warning("Audit log insert failed for auth_password_reset (%s): %s", resident_id, e)

    # Stare sesje muszą zostać unieważnione, inaczej zalogowane urządzenia
    # zachowują dostęp aż do wygaśnięcia access_token (~1h).
    _global_sign_out(resident_id)

    return {"password": new_password}


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
