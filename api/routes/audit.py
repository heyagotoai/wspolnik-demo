from fastapi import APIRouter, Depends, Query

from api.core.security import require_admin
from api.core.supabase_client import get_supabase

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
def list_audit_log(
    _admin: dict = Depends(require_admin),
    table_name: str | None = Query(default=None),
    action: str | None = Query(default=None),
    date_from: str | None = Query(default=None, description="YYYY-MM-DD"),
    date_to: str | None = Query(default=None, description="YYYY-MM-DD"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
):
    """List audit log entries with filters and pagination (admin only)."""
    sb = get_supabase()

    query = sb.table("audit_log").select(
        "id, user_id, action, table_name, record_id, old_data, new_data, created_at",
        count="exact",
    )

    if table_name:
        query = query.eq("table_name", table_name)
    if action:
        query = query.eq("action", action)
    if date_from:
        query = query.gte("created_at", f"{date_from}T00:00:00")
    if date_to:
        query = query.lte("created_at", f"{date_to}T23:59:59")

    offset = (page - 1) * per_page
    query = query.order("created_at", desc=True).range(offset, offset + per_page - 1)

    result = query.execute()

    # Resolve user emails for display
    user_ids = list({r["user_id"] for r in result.data if r.get("user_id")})
    users_map: dict[str, str] = {}
    if user_ids:
        users_result = (
            sb.table("residents")
            .select("id, email, full_name")
            .in_("id", user_ids)
            .execute()
        )
        users_map = {u["id"]: u["full_name"] or u["email"] for u in users_result.data}

    entries = []
    for r in result.data:
        entries.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "user_name": users_map.get(r["user_id"], "System") if r.get("user_id") else "System",
            "action": r["action"],
            "table_name": r["table_name"],
            "record_id": r["record_id"],
            "old_data": r["old_data"],
            "new_data": r["new_data"],
            "created_at": r["created_at"],
        })

    return {
        "data": entries,
        "total": result.count or 0,
        "page": page,
        "per_page": per_page,
    }
