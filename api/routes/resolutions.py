from fastapi import APIRouter, Depends, HTTPException

from api.core.security import get_current_user, require_admin
from api.core.supabase_client import get_supabase
from api.models.schemas import (
    ResolutionCreate,
    ResolutionUpdate,
    ResolutionOut,
    VoteCreate,
    VoteOut,
    VoteResults,
    MessageOut,
)

router = APIRouter(prefix="/resolutions", tags=["resolutions"])


# ── Admin CRUD ──────────────────────────────────────────────


@router.get("", response_model=list[ResolutionOut])
def list_resolutions(_user: dict = Depends(get_current_user)):
    """List all resolutions (any logged-in user)."""
    sb = get_supabase()
    result = sb.table("resolutions").select("*").order("created_at", desc=True).execute()
    return result.data


@router.post("", response_model=ResolutionOut, status_code=201)
def create_resolution(body: ResolutionCreate, _admin: dict = Depends(require_admin)):
    """Create a new resolution (admin only)."""
    sb = get_supabase()

    payload = body.model_dump(exclude_none=True)
    result = sb.table("resolutions").insert(payload).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Nie udało się utworzyć uchwały")

    return result.data[0]


@router.patch("/{resolution_id}", response_model=ResolutionOut)
def update_resolution(
    resolution_id: str,
    body: ResolutionUpdate,
    _admin: dict = Depends(require_admin),
):
    """Update a resolution (admin only)."""
    sb = get_supabase()

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji")

    result = (
        sb.table("resolutions")
        .update(update_data)
        .eq("id", resolution_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")

    return result.data[0]


@router.delete("/{resolution_id}", response_model=MessageOut)
def delete_resolution(resolution_id: str, _admin: dict = Depends(require_admin)):
    """Delete a resolution and its votes (admin only)."""
    sb = get_supabase()

    check = sb.table("resolutions").select("id").eq("id", resolution_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")

    sb.table("resolutions").delete().eq("id", resolution_id).execute()
    return {"detail": "Uchwała została usunięta"}


# ── Voting ──────────────────────────────────────────────────


@router.get("/{resolution_id}/results", response_model=VoteResults)
def get_vote_results(resolution_id: str, _user: dict = Depends(get_current_user)):
    """Get aggregated voting results for a resolution."""
    sb = get_supabase()

    # Verify resolution exists
    check = sb.table("resolutions").select("id").eq("id", resolution_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")

    votes = sb.table("votes").select("vote").eq("resolution_id", resolution_id).execute()

    counts = {"za": 0, "przeciw": 0, "wstrzymuje": 0}
    for v in votes.data:
        vote_val = v["vote"]
        if vote_val in counts:
            counts[vote_val] += 1

    return VoteResults(
        za=counts["za"],
        przeciw=counts["przeciw"],
        wstrzymuje=counts["wstrzymuje"],
        total=sum(counts.values()),
    )


@router.get("/{resolution_id}/my-vote", response_model=VoteOut | None)
def get_my_vote(resolution_id: str, user: dict = Depends(get_current_user)):
    """Get the current user's vote for a resolution (or null)."""
    sb = get_supabase()

    result = (
        sb.table("votes")
        .select("*")
        .eq("resolution_id", resolution_id)
        .eq("resident_id", user["sub"])
        .execute()
    )

    if not result.data:
        return None
    return result.data[0]


@router.post("/{resolution_id}/vote", response_model=VoteOut, status_code=201)
def cast_vote(
    resolution_id: str,
    body: VoteCreate,
    user: dict = Depends(get_current_user),
):
    """Cast a vote on a resolution. Can only vote once (no changes)."""
    if body.vote not in ("za", "przeciw", "wstrzymuje"):
        raise HTTPException(status_code=400, detail="Nieprawidłowy głos. Dozwolone: za, przeciw, wstrzymuje")

    sb = get_supabase()

    # Check resolution exists and is in 'voting' status
    resolution = sb.table("resolutions").select("id, status").eq("id", resolution_id).execute()
    if not resolution.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")
    if resolution.data[0]["status"] != "voting":
        raise HTTPException(status_code=400, detail="Głosowanie nie jest aktywne dla tej uchwały")

    # Check if user already voted
    existing = (
        sb.table("votes")
        .select("id")
        .eq("resolution_id", resolution_id)
        .eq("resident_id", user["sub"])
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Już oddałeś głos w tej uchwale")

    result = sb.table("votes").insert({
        "resolution_id": resolution_id,
        "resident_id": user["sub"],
        "vote": body.vote,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Nie udało się zapisać głosu")

    return result.data[0]
