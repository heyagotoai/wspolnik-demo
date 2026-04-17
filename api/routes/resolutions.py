import re

from fastapi import APIRouter, Depends, HTTPException, Request

from api.core.config import CRON_SECRET
from api.core.security import get_current_user, require_admin, require_admin_or_manager
from api.core.supabase_client import get_supabase
from api.core.resolution_voting_window import (
    has_voting_ended,
    is_within_voting_period,
)
from api.core.voting_eligibility import check_resolution_vote_eligibility
from api.models.schemas import (
    ResolutionCreate,
    ResolutionUpdate,
    ResolutionOut,
    VoteCreate,
    VoteRegisterAdmin,
    VoteOut,
    VoteResults,
    VoteDetail,
    MessageOut,
)

router = APIRouter(prefix="/resolutions", tags=["resolutions"])

_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _verify_cron(request: Request) -> None:
    auth = request.headers.get("Authorization", "")
    if not CRON_SECRET or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid cron secret")
    if auth.split(" ", 1)[1] != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Invalid cron secret")


def _validate_merged_calendar(merged: dict) -> None:
    """Po zapisie uchwały zawsze wymagane obie daty (dzień, RRRR-MM-DD)."""
    vs = merged.get("voting_start")
    ve = merged.get("voting_end")
    if vs is None or ve is None or not str(vs).strip() or not str(ve).strip():
        raise HTTPException(
            status_code=400,
            detail="Początek i koniec głosowania są wymagane (format RRRR-MM-DD).",
        )
    vs_s = str(vs).strip()[:10]
    ve_s = str(ve).strip()[:10]
    if not _ISO_DATE.match(vs_s) or not _ISO_DATE.match(ve_s):
        raise HTTPException(
            status_code=400,
            detail="Nieprawidłowy format daty (oczekiwano RRRR-MM-DD).",
        )
    if ve_s < vs_s:
        raise HTTPException(
            status_code=400,
            detail="Data końca głosowania musi być taka sama lub późniejsza niż początek.",
        )


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
        end_info = f" Głosowanie trwa do {body.voting_end}."
        title = body.title
        content = f'Rozpoczęto głosowanie nad uchwałą "{title}".{end_info} Zaloguj się do panelu mieszkańca, aby oddać głos.'
        sb.table("announcements").insert({
            "title": f"Nowe głosowanie: {title}",
            "content": content,
            "excerpt": f'Głosowanie nad uchwałą "{title}" jest otwarte.',
            "is_pinned": True,
            "is_public": False,
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

    # Check current row before update
    current = sb.table("resolutions").select("*").eq("id", resolution_id).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")

    current_row = current.data[0]
    old_status = current_row["status"]
    resolution_title = body.title or current_row["title"]

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji")

    merged = {**current_row, **update_data}
    _validate_merged_calendar(merged)

    result = (
        sb.table("resolutions")
        .update(update_data)
        .eq("id", resolution_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")

    # When resetting to draft — snapshot votes then delete (fresh start)
    if body.status == "draft" and old_status in ("voting", "closed"):
        snapshot = sb.table("votes").select("*").eq("resolution_id", resolution_id).execute()
        if snapshot.data:
            sb.table("audit_log").insert({
                "user_id": _admin["sub"],
                "action": "votes_reset",
                "table_name": "votes",
                "record_id": resolution_id,
                "old_data": {"votes": snapshot.data, "reason": "status_reset_to_draft"},
            }).execute()
        sb.table("votes").delete().eq("resolution_id", resolution_id).execute()

    # Auto-create announcement when status changes to "voting"
    if body.status == "voting" and old_status != "voting":
        ve = merged["voting_end"]
        end_info = f" Głosowanie trwa do {ve}."
        content = f'Rozpoczęto głosowanie nad uchwałą "{resolution_title}".{end_info} Zaloguj się do panelu mieszkańca, aby oddać głos.'
        sb.table("announcements").insert({
            "title": f"Nowe głosowanie: {resolution_title}",
            "content": content,
            "excerpt": f'Głosowanie nad uchwałą "{resolution_title}" jest otwarte.',
            "is_pinned": True,
            "is_public": False,
        }).execute()

    return result.data[0]


@router.api_route("/cron/close-ended", methods=["GET", "POST"])
def resolutions_close_ended_cron(request: Request):
    """Codziennie (GitHub Actions): status voting → closed gdy minął ostatni dzień głosowania (PL)."""
    _verify_cron(request)
    sb = get_supabase()
    rows = sb.table("resolutions").select("id, voting_end, status").eq("status", "voting").execute()
    raw = rows.data or []
    # W testach FakeSupabase nie filtruje po .eq — w produkcji Supabase zwraca tylko voting.
    candidates = [r for r in raw if r.get("status") == "voting"]
    if not candidates:
        return {"detail": "Brak uchwał do zamknięcia", "closed": 0}

    closed = 0
    for row in candidates:
        if has_voting_ended(row.get("voting_end")):
            sb.table("resolutions").update({"status": "closed"}).eq("id", row["id"]).execute()
            closed += 1

    return {"detail": f"Zamknięto uchwał: {closed}", "closed": closed}


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

    snapshot = sb.table("votes").select("*").eq("resolution_id", resolution_id).execute()
    count = len(snapshot.data) if snapshot.data else 0

    if count == 0:
        raise HTTPException(status_code=400, detail="Brak głosów do usunięcia")

    # Snapshot before delete — preserves vote history in audit_log
    sb.table("audit_log").insert({
        "user_id": _admin["sub"],
        "action": "votes_reset",
        "table_name": "votes",
        "record_id": resolution_id,
        "old_data": {"votes": snapshot.data, "reason": "manual_reset"},
    }).execute()

    sb.table("votes").delete().eq("resolution_id", resolution_id).execute()
    return {"detail": f"Usunięto {count} głosów"}


@router.post("/{resolution_id}/votes/register", response_model=VoteOut, status_code=201)
def register_vote_meeting(
    resolution_id: str,
    body: VoteRegisterAdmin,
    _admin: dict = Depends(require_admin),
):
    """Zarejestruj głos z zebrania wspólnoty (osobiście), zanim uchwała będzie w głosowaniu online.

    Dozwolone tylko gdy status uchwały = draft. Ten sam zapis co głos online — mieszkaniec nie
    odda drugiego głosu po otwarciu głosowania (UNIQUE + walidacja POST /vote).
    """
    sb = get_supabase()

    resolution = sb.table("resolutions").select("id, status").eq("id", resolution_id).execute()
    if not resolution.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")
    if resolution.data[0]["status"] != "draft":
        raise HTTPException(
            status_code=400,
            detail="Głosy z zebrania można nanosić tylko dla uchwały w statusie szkic",
        )

    ok, denial = check_resolution_vote_eligibility(sb, body.resident_id)
    if not ok:
        raise HTTPException(status_code=403, detail=denial)

    existing = (
        sb.table("votes")
        .select("id")
        .eq("resolution_id", resolution_id)
        .eq("resident_id", body.resident_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=409,
            detail="Ten mieszkaniec ma już zarejestrowany głos przy tej uchwale",
        )

    try:
        result = sb.table("votes").insert({
            "resolution_id": resolution_id,
            "resident_id": body.resident_id,
            "vote": body.vote,
        }).execute()
    except Exception as e:
        if "23505" in str(e) or "unique" in str(e).lower():
            raise HTTPException(
                status_code=409,
                detail="Ten mieszkaniec ma już zarejestrowany głos przy tej uchwale",
            )
        raise HTTPException(status_code=500, detail="Nie udało się zapisać głosu")

    if not result.data:
        raise HTTPException(status_code=500, detail="Nie udało się zapisać głosu")

    return result.data[0]


@router.delete("/{resolution_id}/votes/{resident_id}", response_model=MessageOut)
def delete_single_vote_draft(
    resolution_id: str,
    resident_id: str,
    _admin: dict = Depends(require_admin),
):
    """Usuń pojedynczy głos — tylko dla uchwały w szkicu (korekta przed publikacją)."""
    sb = get_supabase()

    resolution = sb.table("resolutions").select("id, status").eq("id", resolution_id).execute()
    if not resolution.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")
    if resolution.data[0]["status"] != "draft":
        raise HTTPException(
            status_code=400,
            detail="Usuwanie pojedynczego głosu jest możliwe tylko przy uchwale w szkicu",
        )

    existing = (
        sb.table("votes")
        .select("id")
        .eq("resolution_id", resolution_id)
        .eq("resident_id", resident_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Brak głosu do usunięcia")

    sb.table("votes").delete().eq("resolution_id", resolution_id).eq("resident_id", resident_id).execute()
    return {"detail": "Głos usunięty"}


# ── Voting ──────────────────────────────────────────────────


@router.get("/{resolution_id}/results", response_model=VoteResults)
def get_vote_results(resolution_id: str, _user: dict = Depends(get_current_user)):
    """Get aggregated voting results for a resolution."""
    sb = get_supabase()

    # Verify resolution exists
    check = sb.table("resolutions").select("id").eq("id", resolution_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")

    votes = sb.table("votes").select("vote, resident_id").eq("resolution_id", resolution_id).execute()
    apartments = sb.table("apartments").select("owner_resident_id, share").execute()

    resident_share: dict[str, float] = {}
    total_share_community = 0.0
    for a in apartments.data or []:
        sh = a.get("share")
        if sh is None:
            continue
        fv = float(sh)
        total_share_community += fv
        oid = a.get("owner_resident_id")
        if oid:
            resident_share[oid] = resident_share.get(oid, 0.0) + fv

    counts = {"za": 0, "przeciw": 0, "wstrzymuje": 0}
    shares = {"za": 0.0, "przeciw": 0.0, "wstrzymuje": 0.0}
    for v in votes.data or []:
        vote_val = v["vote"]
        if vote_val not in counts:
            continue
        counts[vote_val] += 1
        rid = v.get("resident_id")
        w = resident_share.get(rid, 0.0) if rid else 0.0
        shares[vote_val] += w

    return VoteResults(
        za=counts["za"],
        przeciw=counts["przeciw"],
        wstrzymuje=counts["wstrzymuje"],
        total=sum(counts.values()),
        share_za=round(shares["za"], 8),
        share_przeciw=round(shares["przeciw"], 8),
        share_wstrzymuje=round(shares["wstrzymuje"], 8),
        total_share_community=round(total_share_community, 8),
    )


@router.get("/{resolution_id}/votes", response_model=list[VoteDetail])
def get_resolution_vote_details(resolution_id: str, _user: dict = Depends(require_admin_or_manager)):
    """Get all individual votes with resident details for a resolution (admin or manager)."""
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

    apt_result = (
        sb.table("apartments")
        .select("owner_resident_id, number, share")
        .in_("owner_resident_id", resident_ids)
        .execute()
    )
    apts_count: dict[str, int] = {}
    apts_share: dict[str, float] = {}
    apts_numbers: dict[str, list[str]] = {}
    for a in apt_result.data or []:
        oid = a.get("owner_resident_id")
        if not oid:
            continue
        apts_count[oid] = apts_count.get(oid, 0) + 1
        sh = a.get("share")
        if sh is not None:
            apts_share[oid] = apts_share.get(oid, 0.0) + float(sh)
        num = a.get("number")
        if num:
            apts_numbers.setdefault(oid, []).append(str(num))

    for nums in apts_numbers.values():
        nums.sort()

    return [
        VoteDetail(
            resident_id=v["resident_id"],
            full_name=residents_map.get(v["resident_id"], {}).get("full_name", "—"),
            apartment_number=(
                ", ".join(apts_numbers[v["resident_id"]])
                if apts_numbers.get(v["resident_id"])
                else residents_map.get(v["resident_id"], {}).get("apartment_number")
            ),
            apartments_count=apts_count.get(v["resident_id"], 0),
            share=round(apts_share.get(v["resident_id"], 0.0), 8),
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

    # Check resolution exists and is in 'voting' status; okres wg dat (PL)
    resolution = (
        sb.table("resolutions")
        .select("id, status, voting_start, voting_end")
        .eq("id", resolution_id)
        .execute()
    )
    if not resolution.data:
        raise HTTPException(status_code=404, detail="Uchwała nie znaleziona")
    row = resolution.data[0]
    if row["status"] != "voting":
        raise HTTPException(status_code=400, detail="Głosowanie nie jest aktywne dla tej uchwały")
    if not is_within_voting_period(row.get("voting_start"), row.get("voting_end")):
        raise HTTPException(
            status_code=400,
            detail="Trwa poza zaplanowanym okresem głosowania (daty początku/końca)",
        )

    ok, denial = check_resolution_vote_eligibility(sb, user["sub"])
    if not ok:
        raise HTTPException(status_code=403, detail=denial)

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
