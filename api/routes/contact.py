import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request

from api.core.config import CRON_SECRET, SUPABASE_URL
from api.core.email_disclaimer import automated_email_footer, contact_form_relay_footer
from api.core.supabase_client import get_supabase
from api.models.schemas import ContactMessageCreate, MessageOut

router = APIRouter()
logger = logging.getLogger(__name__)

RETENTION_MONTHS = 12  # wiadomości starsze niż 12 miesięcy są usuwane


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
        f"{contact_form_relay_footer()}"
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


CONTACT_RATE_LIMIT = 5  # max messages per hour per email


def _verify_cron(request: Request) -> None:
    auth = request.headers.get("Authorization", "")
    if not CRON_SECRET or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    if auth.split(" ", 1)[1] != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Invalid cron secret")


def _get_admin_and_manager_emails(sb) -> list[str]:
    try:
        result = (
            sb.table("residents")
            .select("email")
            .in_("role", ["admin", "manager"])
            .eq("is_active", True)
            .execute()
        )
        return [r["email"] for r in result.data if r.get("email")]
    except Exception as e:
        logger.warning("Contact cron: nie udało się pobrać listy odbiorców: %s", e)
        return []


def _send_cleanup_notification(subject: str, body: str) -> None:
    sb = get_supabase()
    emails = _get_admin_and_manager_emails(sb)
    if not emails:
        logger.warning("Contact cron: brak odbiorców powiadomienia")
        return
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    if not SUPABASE_URL or not anon_key:
        logger.warning("Contact cron: brak konfiguracji email")
        return
    for email in emails:
        try:
            httpx.post(
                f"{SUPABASE_URL}/functions/v1/send-email",
                json={"to": email, "subject": subject, "body": body},
                headers={
                    "Authorization": f"Bearer {anon_key}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
        except Exception as e:
            logger.warning("Contact cron: nie udało się wysłać powiadomienia do %s: %s", email, e)


@router.post("/contact", response_model=MessageOut)
def send_contact_message(payload: ContactMessageCreate):
    sb = get_supabase()

    # Rate limiting: max 3 wiadomości na godzinę z tego samego emaila
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent = (
        sb.table("contact_messages")
        .select("id", count="exact")
        .eq("email", payload.email)
        .gte("created_at", one_hour_ago)
        .execute()
    )
    if (recent.count or 0) >= CONTACT_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Zbyt wiele wiadomości. Spróbuj ponownie za godzinę.",
        )

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


@router.api_route("/contact/cron", methods=["GET", "POST"])
def contact_cleanup_cron(request: Request):
    """Miesięczny cron (GET from Vercel Cron) — usuwa wiadomości starsze niż 12 miesięcy.

    Wysyła do adminów i zarządców:
    1. Ostrzeżenie o wiadomościach, które wygasną w ciągu 30 dni (następny cykl).
    2. Raport z usuniętych wiadomości.
    """
    _verify_cron(request)

    sb = get_supabase()
    now = datetime.now(timezone.utc)
    cutoff_delete = now - timedelta(days=365)        # 12 miesięcy — do usunięcia
    cutoff_warning = now - timedelta(days=335)       # ~11 miesięcy — ostrzeżenie

    # Wiadomości, które wygasną przy następnym uruchomieniu (11–12 miesięcy)
    expiring_result = (
        sb.table("contact_messages")
        .select("id", count="exact")
        .lt("created_at", cutoff_warning.isoformat())
        .gte("created_at", cutoff_delete.isoformat())
        .execute()
    )
    expiring_count = expiring_result.count or 0

    # Wiadomości do usunięcia (starsze niż 12 miesięcy)
    to_delete_result = (
        sb.table("contact_messages")
        .select("id", count="exact")
        .lt("created_at", cutoff_delete.isoformat())
        .execute()
    )
    deleted_count = to_delete_result.count or 0

    if deleted_count > 0:
        sb.table("contact_messages").delete().lt("created_at", cutoff_delete.isoformat()).execute()
        logger.info("Contact cron: usunięto %d wiadomości starszych niż 12 miesięcy", deleted_count)

    expiry_warning = (
        f"\n⚠️  Uwaga: {expiring_count} wiadomości wygaśnie przy następnym uruchomieniu crona (za ~30 dni).\n"
        f"Jeśli chcesz je zachować, wyeksportuj je ręcznie przed następnym 1. dniem miesiąca.\n"
        if expiring_count > 0 else ""
    )

    _send_cleanup_notification(
        subject="[WM GABI] Czyszczenie wiadomości kontaktowych",
        body=(
            f"Miesięczny cron retencji wiadomości kontaktowych — {now.strftime('%Y-%m-%d')}.\n\n"
            f"Usunięto wiadomości: {deleted_count}\n"
            f"(wiadomości starsze niż {RETENTION_MONTHS} miesięcy)\n"
            f"{expiry_warning}"
            f"{automated_email_footer()}"
        ),
    )

    return {"deleted": deleted_count, "expiring_next_run": expiring_count}
