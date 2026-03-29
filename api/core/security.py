from fastapi import Depends, HTTPException, Request

from api.core.supabase_client import get_supabase


def get_current_user(request: Request) -> dict:
    """Verify the Supabase JWT by calling Supabase Auth API.

    Returns dict with user info (id, email, etc.).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Brak tokenu autoryzacji")

    token = auth_header.split(" ", 1)[1]

    sb = get_supabase()
    try:
        user_response = sb.auth.get_user(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Nieprawidłowy token: {e}")

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Nie udało się zweryfikować tokenu")

    user = user_response.user
    return {"sub": user.id, "email": user.email}


def require_admin(user_info: dict = Depends(get_current_user)) -> dict:
    """Ensure the current user has admin role in the residents table."""
    user_id = user_info.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Brak identyfikatora użytkownika")

    sb = get_supabase()
    result = sb.table("residents").select("role").eq("id", user_id).single().execute()

    if not result.data or result.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Brak uprawnień administratora")

    return user_info


def require_admin_or_manager(user_info: dict = Depends(get_current_user)) -> dict:
    """Ensure the current user has admin or manager role in the residents table."""
    user_id = user_info.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Brak identyfikatora użytkownika")

    sb = get_supabase()
    result = sb.table("residents").select("role").eq("id", user_id).single().execute()

    role = result.data.get("role") if result.data else None
    if role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    user_info["role"] = role
    return user_info
