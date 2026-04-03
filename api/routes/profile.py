from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from api.core.config import CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION
from api.core.security import get_current_user
from api.core.supabase_client import get_supabase
from api.core.voting_eligibility import check_resolution_vote_eligibility
from api.models.schemas import (
    ProfileOut,
    ProfileUpdate,
    ChangePassword,
    MessageOut,
    LegalConsentBody,
)

router = APIRouter(prefix="/profile", tags=["profile"])


def _needs_legal_acceptance(row: dict) -> bool:
    pv = row.get("privacy_version")
    tv = row.get("terms_version")
    pa = row.get("privacy_accepted_at")
    ta = row.get("terms_accepted_at")
    if not pa or not ta or not pv or not tv:
        return True
    return pv != CURRENT_PRIVACY_VERSION or tv != CURRENT_TERMS_VERSION


def _profile_out(sb, row: dict, user_id: str) -> ProfileOut:
    ok, _ = check_resolution_vote_eligibility(sb, user_id)
    return ProfileOut(
        id=row["id"],
        email=row["email"],
        full_name=row["full_name"],
        apartment_number=row.get("apartment_number"),
        role=row["role"],
        is_active=row.get("is_active", True),
        created_at=row["created_at"],
        can_vote_resolutions=ok,
        needs_legal_acceptance=_needs_legal_acceptance(row),
        current_privacy_version=CURRENT_PRIVACY_VERSION,
        current_terms_version=CURRENT_TERMS_VERSION,
        privacy_accepted_at=row.get("privacy_accepted_at"),
        terms_accepted_at=row.get("terms_accepted_at"),
        privacy_version=row.get("privacy_version"),
        terms_version=row.get("terms_version"),
    )


@router.get("", response_model=ProfileOut)
def get_profile(user: dict = Depends(get_current_user)):
    """Get current user's profile data."""
    sb = get_supabase()
    result = sb.table("residents").select("*").eq("id", user["sub"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Profil nie znaleziony")

    return _profile_out(sb, result.data[0], user["sub"])


@router.patch("", response_model=ProfileOut)
def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    """Update current user's profile (name only)."""
    # full_name validation (min 2 chars, not blank) handled by Pydantic

    sb = get_supabase()
    result = (
        sb.table("residents")
        .update({"full_name": body.full_name})
        .eq("id", user["sub"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Profil nie znaleziony")

    return _profile_out(sb, result.data[0], user["sub"])


@router.post("/legal-consent", response_model=ProfileOut)
def accept_legal_consent(body: LegalConsentBody, user: dict = Depends(get_current_user)):
    """Zapisz akceptację aktualnych wersji polityki prywatności i regulaminu."""
    if not body.accept_privacy or not body.accept_terms:
        raise HTTPException(
            status_code=400,
            detail="Akceptacja polityki prywatności i regulaminu jest wymagana do korzystania z portalu.",
        )

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    sb = get_supabase()
    patch = {
        "privacy_accepted_at": now,
        "terms_accepted_at": now,
        "privacy_version": CURRENT_PRIVACY_VERSION,
        "terms_version": CURRENT_TERMS_VERSION,
    }
    result = (
        sb.table("residents")
        .update(patch)
        .eq("id", user["sub"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Profil nie znaleziony")

    row = result.data[0] if isinstance(result.data, list) else result.data
    return _profile_out(sb, row, user["sub"])


@router.post("/change-password", response_model=MessageOut)
def change_password(body: ChangePassword, user: dict = Depends(get_current_user)):
    """Change current user's password. Verifies old password first."""
    # password length validation (min 6) handled by Pydantic

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
