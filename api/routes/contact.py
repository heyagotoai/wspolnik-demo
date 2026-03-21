import logging
import smtplib
from email.mime.text import MIMEText

from fastapi import APIRouter, HTTPException

from api.core.supabase_client import get_supabase
from api.models.schemas import ContactMessageCreate, MessageOut

router = APIRouter()
logger = logging.getLogger(__name__)


def _try_send_email(msg: ContactMessageCreate) -> None:
    """Send email notification to admin if SMTP is configured."""
    import os

    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    admin_email = os.getenv("ADMIN_EMAIL")

    if not all([smtp_host, smtp_user, smtp_pass, admin_email]):
        logger.info("SMTP not configured — skipping email notification")
        return

    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    body = (
        f"Nowa wiadomość z formularza kontaktowego:\n\n"
        f"Od: {msg.name} <{msg.email}>\n"
        f"Lokal: {msg.apartment_number or '—'}\n"
        f"Temat: {msg.subject}\n\n"
        f"{msg.message}"
    )

    email = MIMEText(body, "plain", "utf-8")
    email["Subject"] = f"[WM GABI] {msg.subject}"
    email["From"] = smtp_user
    email["To"] = admin_email
    email["Reply-To"] = msg.email

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(email)
        logger.info("Email notification sent to %s", admin_email)
    except Exception as e:
        logger.warning("Failed to send email: %s", e)


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
