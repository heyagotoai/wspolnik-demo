from fastapi import APIRouter, Depends, HTTPException

from api.core.security import get_current_user
from api.core.supabase_client import get_supabase
from api.models.schemas import ProfileOut, ProfileUpdate, ChangePassword, MessageOut

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
def get_profile(user: dict = Depends(get_current_user)):
    """Get current user's profile data."""
    sb = get_supabase()
    result = sb.table("residents").select("*").eq("id", user["sub"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Profil nie znaleziony")

    return result.data[0]


@router.patch("", response_model=ProfileOut)
def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    """Update current user's profile (name only)."""
    if not body.full_name or not body.full_name.strip():
        raise HTTPException(status_code=400, detail="Imię i nazwisko nie może być puste")

    sb = get_supabase()
    result = (
        sb.table("residents")
        .update({"full_name": body.full_name.strip()})
        .eq("id", user["sub"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Profil nie znaleziony")

    return result.data[0]


@router.post("/change-password", response_model=MessageOut)
def change_password(body: ChangePassword, user: dict = Depends(get_current_user)):
    """Change current user's password. Verifies old password first."""
    if len(body.new_password) < 6:
        raise HTTPException(
            status_code=400, detail="Nowe hasło musi mieć minimum 6 znaków"
        )

    sb = get_supabase()

    # Verify current password by attempting sign-in
    try:
        sb.auth.sign_in_with_password(
            {"email": user["email"], "password": body.current_password}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Obecne hasło jest nieprawidłowe")

    # Update password via admin API
    try:
        sb.auth.admin.update_user_by_id(
            user["sub"], {"password": body.new_password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Błąd zmiany hasła: {e}"
        )

    return {"detail": "Hasło zostało zmienione"}
