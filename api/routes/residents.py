from fastapi import APIRouter, Depends, HTTPException

from api.core.security import require_admin
from api.core.supabase_client import get_supabase
from api.models.schemas import ResidentCreate, ResidentUpdate, ResidentOut, MessageOut

router = APIRouter(prefix="/residents", tags=["residents"])


@router.get("", response_model=list[ResidentOut])
def list_residents(_admin: dict = Depends(require_admin)):
    """List all residents (admin only)."""
    sb = get_supabase()
    result = sb.table("residents").select("*").order("full_name").execute()
    return result.data


@router.post("", response_model=ResidentOut, status_code=201)
def create_resident(body: ResidentCreate, _admin: dict = Depends(require_admin)):
    """Create a new auth user and corresponding resident record.

    Uses Supabase Admin API (service_role key) to create the auth user,
    then inserts a row into the residents table.
    """
    sb = get_supabase()

    # 1. Create auth user via Supabase Admin API
    try:
        auth_response = sb.auth.admin.create_user(
            {
                "email": body.email,
                "password": body.password,
                "email_confirm": True,  # auto-confirm so user can log in immediately
                "user_metadata": {"full_name": body.full_name},
            }
        )
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
        "email": body.email,
        "full_name": body.full_name,
        "apartment_number": body.apartment_number,
        "role": body.role,
        "is_active": True,
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

    return result.data[0]


@router.patch("/{resident_id}", response_model=ResidentOut)
def update_resident(
    resident_id: str,
    body: ResidentUpdate,
    _admin: dict = Depends(require_admin),
):
    """Update resident data (admin only)."""
    sb = get_supabase()

    update_data = body.model_dump(exclude_none=True)
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

    # 1. Delete from residents table
    sb.table("residents").delete().eq("id", resident_id).execute()

    # 2. Delete auth user
    try:
        sb.auth.admin.delete_user(resident_id)
    except Exception:
        # Auth user may have already been deleted — that's fine
        pass

    return {"detail": "Mieszkaniec został usunięty"}
