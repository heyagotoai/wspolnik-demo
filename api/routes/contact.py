import logging
import os

import httpx
from fastapi import APIRouter, HTTPException

from api.core.supabase_client import get_supabase
from api.models.schemas import ContactMessageCreate, MessageOut

router = APIRouter()
logger = logging.getLogger(__name__)


def _try_send_email(msg: ContactMessageCreate) -> None:
    """Send email notification to admin via Supabase Edge Function."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
    admin_email = os.getenv("ADMIN_EMAIL")

    if not all([supabase_url, supabase_anon_key, admin_email]):
        logger.info("Email notification not configured — skipping")
        return

    body = (
        f"Nowa wiadomość z formularza kontaktowego:\n\n"
        f"Od: {msg.name} <{msg.email}>\n"
        f"Lokal: {msg.apartment_number or '—'}\n"
        f"Temat: {msg.subject}\n\n"
        f"{msg.message}"
    )

    try:
        response = httpx.post(
            f"{supabase_url}/functions/v1/send-email",
            json={
                "to": admin_email,
                "subject": f"[WM GABI] {msg.subject}",
                "body": body,
                "replyTo": msg.email,
            },
            headers={
                "Authorization": f"Bearer {supabase_anon_key}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        if response.status_code == 200:
            logger.info("Email notification sent to %s", admin_email)
        else:
            logger.warning("Edge function returned %s: %s", response.status_code, response.text)
    except Exception as e:
        logger.warning("Failed to send email via edge function: %s", e)


@router.post("/contact", response_model=MessageOut)
def send_contact_message(payload: ContactMessageCreate):
    sb = get_supabase()

    result = sb.table("contact_messages").insert({
        "name": payload.name,
        "email": payload.email,
        "apartment_number": payload.apartment_number or None,
        "subject": payload.subject,
        "message": payload.message,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Nie udało się zapisać wiadomości")

    _try_send_email(payload)

    return {"detail": "Wiadomość została wysłana"}
