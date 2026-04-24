"""Announcement mailing — send announcements to all active residents via email."""

import logging
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException

from api.core.email_disclaimer import automated_email_footer, PUBLIC_SITE_URL
from api.core.security import require_admin_or_manager
from api.core.supabase_client import get_supabase
from api.models.schemas import MessageOut

router = APIRouter(prefix="/announcements", tags=["announcements"])
logger = logging.getLogger(__name__)


def _send_one_email(
    supabase_url: str,
    anon_key: str,
    to: str,
    subject: str,
    body: str,
) -> bool:
    """Send a single email via Supabase Edge Function. Returns True on success."""
    try:
        resp = httpx.post(
            f"{supabase_url}/functions/v1/send-email",
            json={"to": to, "subject": subject, "body": body},
            headers={
                "Authorization": f"Bearer {anon_key}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
        if resp.status_code == 200:
            return True
        logger.warning("Edge function returned %s for %s: %s", resp.status_code, to, resp.text)
        return False
    except Exception as e:
        logger.warning("Failed to send email to %s: %s", to, e)
        return False


@router.post("/{announcement_id}/send-email", response_model=MessageOut)
def send_announcement_email(
    announcement_id: str,
    _user: dict = Depends(require_admin_or_manager),
):
    """Send announcement to all active residents via email (admin or manager)."""
    sb = get_supabase()

    # Fetch announcement
    ann = sb.table("announcements").select("*").eq("id", announcement_id).single().execute()
    if not ann.data:
        raise HTTPException(status_code=404, detail="Ogłoszenie nie znalezione")

    if ann.data.get("email_sent_at"):
        raise HTTPException(status_code=400, detail="Email już został wysłany dla tego ogłoszenia")

    # Fetch active residents (pomijamy „bez konta" — brak email — w pętli poniżej)
    residents = sb.table("residents").select("email, full_name").eq("is_active", True).execute()
    if not residents.data:
        raise HTTPException(status_code=400, detail="Brak aktywnych mieszkańców")
    if not any((r.get("email") or "").strip() for r in residents.data):
        raise HTTPException(status_code=400, detail="Brak aktywnych mieszkańców z adresem email")

    # Check email config
    supabase_url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not anon_key:
        raise HTTPException(status_code=500, detail="Konfiguracja email nie jest ustawiona")

    # Send emails
    title = ann.data["title"]
    content = ann.data["content"]
    subject = f"[WM GABI] {title}"
    body = (
        f"Nowe ogłoszenie w serwisie WM GABI:\n\n"
        f"{title}\n"
        f"{'=' * len(title)}\n\n"
        f"{content}"
        f"{automated_email_footer()}"
        f"Szczegóły ogłoszenia po zalogowaniu: {PUBLIC_SITE_URL}\n"
    )

    sent = 0
    failed = 0
    for resident in residents.data:
        email = (resident.get("email") or "").strip()
        if not email:
            # Safety net: mieszkańcy „bez konta" (rejestr do głosów z zebrania)
            continue
        ok = _send_one_email(supabase_url, anon_key, email, subject, body)
        if ok:
            sent += 1
        else:
            failed += 1

    # Mark as sent
    now = datetime.now(timezone.utc).isoformat()
    sb.table("announcements").update({"email_sent_at": now}).eq("id", announcement_id).execute()

    if failed == 0:
        return {"detail": f"Wysłano email do {sent} mieszkańców"}
    return {"detail": f"Wysłano {sent}, nie udało się {failed}"}
