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
    VoteDetail,
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

    # Auto-create announcement when created directly with "voting" status
    if body.status == "voting":
        voting_end = result.data[0].get("voting_end")
        end_info = ""
        if voting_end:
            end_info = f" Głosowanie trwa do {voting_end}."

        title = body.title
        content = f'Rozpoczęto głosowanie nad uchwałą "{title}".{end_info} Zaloguj się do panelu mieszkańca, aby oddać głos.'
        sb.table("announcements").insert({
            "title": f"Nowe głosowanie: {title}",
            "content": content,
            "excerpt": f'Głosowanie nad uchwałą "{title}" jest otwarte.',
            "is_pinned": True,
        }).execute()

    return result.data[0]


@router.patch("/{resolution_id}", response_model=ResolutionOut)
def update_resolution(
    resolution_id: str,
    body: ResolutionUpdate,
    _admin: dict = Depends(require_admin),
):
    """Update a resolution (admin only)."""
    sb = get_supabase()

    # Check current status before update
    current = sb.table("resolutions").select("status, title").eq("id", resolution_id).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")

    old_status = current.data[0]["status"]
    resolution_title = body.title or current.data[0]["title"]

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

    # When resetting to draft — delete all votes (fresh start)
    if body.status == "draft" and old_status in ("voting", "closed"):
        sb.table("votes").delete().eq("resolution_id", resolution_id).execute()

    # Auto-create announcement when status changes to "voting"
    if body.status == "voting" and old_status != "voting":
        voting_end = result.data[0].get("voting_end")
        end_info = ""
        if voting_end:
            end_info = f" Głosowanie trwa do {voting_end}."

        content = f'Rozpoczęto głosowanie nad uchwałą "{resolution_title}".{end_info} Zaloguj się do panelu mieszkańca, aby oddać głos.'
        sb.table("announcements").insert({
            "title": f"Nowe głosowanie: {resolution_title}",
            "content": content,
            "excerpt": f'Głosowanie nad uchwałą "{resolution_title}" jest otwarte.',
            "is_pinned": True,
        }).execute()

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


@router.delete("/{resolution_id}/votes", response_model=MessageOut)
def reset_votes(resolution_id: str, _admin: dict = Depends(require_admin)):
    """Delete all votes for a resolution (admin only). Resolution status stays unchanged."""
    sb = get_supabase()

    check = sb.table("resolutions").select("id, title, status").eq("id", resolution_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")

    votes = sb.table("votes").select("id").eq("resolution_id", resolution_id).execute()
    count = len(votes.data) if votes.data else 0

    if count == 0:
        raise HTTPException(status_code=400, detail="Brak głosów do usunięcia")

    sb.table("votes").delete().eq("resolution_id", resolution_id).execute()
    return {"detail": f"Usunięto {count} głosów"}


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


@router.get("/{resolution_id}/votes", response_model=list[VoteDetail])
def get_resolution_vote_details(resolution_id: str, _admin: dict = Depends(require_admin)):
    """Get all individual votes with resident details for a resolution (admin only)."""
    sb = get_supabase()

    check = sb.table("resolutions").select("id").eq("id", resolution_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")

    votes = (
        sb.table("votes")
        .select("*")
        .eq("resolution_id", resolution_id)
        .order("voted_at")
        .execute()
    )

    if not votes.data:
        return []

    resident_ids = list({v["resident_id"] for v in votes.data})
    residents_result = (
        sb.table("residents")
        .select("id, full_name, apartment_number")
        .in_("id", resident_ids)
        .execute()
    )
    residents_map = {r["id"]: r for r in residents_result.data}

    return [
        VoteDetail(
            resident_id=v["resident_id"],
            full_name=residents_map.get(v["resident_id"], {}).get("full_name", "—"),
            apartment_number=residents_map.get(v["resident_id"], {}).get("apartment_number"),
            vote=v["vote"],
            voted_at=v["voted_at"],
        )
        for v in votes.data
    ]


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
    # vote value is now validated by Pydantic (Literal type)

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

    try:
        result = sb.table("votes").insert({
            "resolution_id": resolution_id,
            "resident_id": user["sub"],
            "vote": body.vote,
        }).execute()
    except Exception as e:
        # Unique constraint violation (race condition) — treat as already voted
        if "23505" in str(e) or "unique" in str(e).lower():
            raise HTTPException(status_code=409, detail="Już oddałeś głos w tej uchwale")
        raise HTTPException(status_code=500, detail="Nie udało się zapisać głosu")

    if not result.data:
        raise HTTPException(status_code=500, detail="Nie udało się zapisać głosu")

    return result.data[0]
