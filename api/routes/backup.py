"""Weekly database backup to Supabase Storage.

Vercel Cron calls POST /api/backup/cron every Sunday at 02:00 UTC.
Exports key tables + auth users list + document files as JSON to Storage bucket 'backups'.
Keeps last 12 weekly backups, deletes older ones.
Sends email notification to admins on completion or failure.
"""

import base64
import json
import logging
import os
from datetime import date, datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request

from api.core.config import CRON_SECRET, SUPABASE_URL
from api.core.email_disclaimer import automated_email_footer
from api.core.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backup", tags=["backup"])

TABLES_TO_BACKUP = [
    "apartments",
    "residents",
    "charges",
    "payments",
    "charge_rates",
    "bank_statements",
    "resolutions",
    "votes",
    "system_settings",
]

RETENTION_WEEKS = 12
BUCKET = "backups"
DOCUMENTS_BUCKET = "documents"


def _verify_cron(request: Request) -> None:
    auth = request.headers.get("Authorization", "")
    if not CRON_SECRET or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    if auth.split(" ", 1)[1] != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Invalid cron secret")


def _export_tables(sb) -> dict:
    """Export all configured tables to a dict."""
    data = {}
    for table_name in TABLES_TO_BACKUP:
        try:
            result = sb.table(table_name).select("*").execute()
            data[table_name] = result.data
        except Exception as e:
            logger.warning("Backup: nie udało się wyeksportować tabeli %s: %s", table_name, e)
            data[table_name] = {"error": str(e)}
    return data


def _export_auth_users(sb) -> list[dict]:
    """Export auth users list via Supabase Admin API."""
    try:
        response = sb.auth.admin.list_users()
        return [
            {
                "id": str(u.id),
                "email": u.email,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_sign_in_at": u.last_sign_in_at.isoformat() if u.last_sign_in_at else None,
                "user_metadata": u.user_metadata,
            }
            for u in response
        ]
    except Exception as e:
        logger.warning("Backup: nie udało się wyeksportować auth.users: %s", e)
        return [{"error": str(e)}]


def _export_documents(sb) -> list[dict]:
    """Export PDF files from 'documents' bucket as base64.

    Returns list of {name, base64} dicts. Files that fail to download
    are included with an error field instead.
    """
    documents = []
    try:
        files = sb.storage.from_(DOCUMENTS_BUCKET).list()
        if not files:
            return []

        for f in files:
            name = f["name"]
            try:
                file_bytes = sb.storage.from_(DOCUMENTS_BUCKET).download(name)
                documents.append({
                    "name": name,
                    "base64": base64.b64encode(file_bytes).decode("ascii"),
                })
            except Exception as e:
                logger.warning("Backup: nie udało się pobrać pliku %s: %s", name, e)
                documents.append({"name": name, "error": str(e)})
    except Exception as e:
        logger.warning("Backup: nie udało się wylistować bucketu documents: %s", e)
        return [{"error": str(e)}]

    return documents


def _cleanup_old_backups(sb, keep: int = RETENTION_WEEKS) -> int:
    """Remove backups older than `keep` most recent ones. Returns count of deleted files."""
    try:
        files = sb.storage.from_(BUCKET).list()
        if not files:
            return 0

        # Sort by name descending (names start with date, so alphabetical = chronological)
        sorted_files = sorted(files, key=lambda f: f["name"], reverse=True)
        to_delete = sorted_files[keep:]

        if not to_delete:
            return 0

        paths = [f["name"] for f in to_delete]
        sb.storage.from_(BUCKET).remove(paths)
        return len(paths)
    except Exception as e:
        logger.warning("Backup: cleanup nie powiódł się: %s", e)
        return 0


def _get_admin_emails(sb) -> list[str]:
    """Get email addresses of all active admins."""
    try:
        result = (
            sb.table("residents")
            .select("email")
            .eq("role", "admin")
            .eq("is_active", True)
            .execute()
        )
        return [r["email"] for r in result.data if r.get("email")]
    except Exception as e:
        logger.warning("Backup: nie udało się pobrać listy adminów: %s", e)
        return []


def _send_notification(subject: str, body: str) -> None:
    """Send backup notification email to all admins via Edge Function."""
    sb = get_supabase()
    admin_emails = _get_admin_emails(sb)

    if not admin_emails:
        logger.warning("Backup: brak adminów do powiadomienia")
        return

    anon_key = os.getenv("SUPABASE_ANON_KEY")
    if not SUPABASE_URL or not anon_key:
        logger.warning("Backup: brak konfiguracji email — nie wysłano powiadomienia")
        return

    for email in admin_emails:
        try:
            httpx.post(
                f"{SUPABASE_URL}/functions/v1/send-email",
                json={"to": email, "subject": subject, "body": body},
                headers={
                    "Authorization": f"Bearer {anon_key}",
                    "Content-Type": "application/json",
                },
                timeout=15,
            )
        except Exception as e:
            logger.warning("Backup: nie udało się wysłać powiadomienia do %s: %s", email, e)


@router.api_route("/cron", methods=["GET", "POST"])
def backup_cron(request: Request):
    """Weekly backup cron (GET from Vercel Cron). Exports DB tables + auth users + documents to Supabase Storage."""
    _verify_cron(request)

    sb = get_supabase()
    today = date.today()
    now = datetime.now(timezone.utc)
    filename = f"{today.isoformat()}_backup.json"

    # Export data
    logger.info("Backup: rozpoczynam eksport danych (%s)", filename)
    tables_data = _export_tables(sb)
    auth_users = _export_auth_users(sb)
    documents = _export_documents(sb)

    backup_payload = {
        "created_at": now.isoformat(),
        "tables": tables_data,
        "auth_users": auth_users,
        "documents": documents,
        "metadata": {
            "tables_count": len(TABLES_TO_BACKUP),
            "auth_users_count": len(auth_users),
            "documents_count": len(documents),
        },
    }

    backup_bytes = json.dumps(backup_payload, ensure_ascii=False, default=str).encode("utf-8")
    size_kb = len(backup_bytes) / 1024

    # Upload to Storage
    try:
        sb.storage.from_(BUCKET).upload(
            path=filename,
            file=backup_bytes,
            file_options={"content-type": "application/json"},
        )
    except Exception as e:
        logger.error("Backup: upload nie powiódł się: %s", e)
        _send_notification(
            subject="[WM GABI] Backup NIEUDANY",
            body=(
                f"Tygodniowy backup z {today.isoformat()} nie powiódł się.\n\n"
                f"Błąd: {e}\n\n"
                f"Sprawdź logi w Vercel Dashboard."
                f"{automated_email_footer()}"
            ),
        )
        raise HTTPException(status_code=500, detail=f"Backup upload failed: {e}")

    # Cleanup old backups
    deleted = _cleanup_old_backups(sb)

    logger.info("Backup: zakończono (%s, usunięto %d starych)", filename, deleted)

    # Send success notification
    _send_notification(
        subject="[WM GABI] Backup OK",
        body=(
            f"Tygodniowy backup z {today.isoformat()} zakończony pomyślnie.\n\n"
            f"Plik: {filename}\n"
            f"Rozmiar: {size_kb:.1f} KB\n"
            f"Tabele: {len(tables_data)}\n"
            f"Użytkownicy auth: {len(auth_users)}\n"
            f"Dokumenty PDF: {len(documents)}\n"
            f"Usunięto starych backupów: {deleted}\n\n"
            f"Retencja: {RETENTION_WEEKS} tygodni"
            f"{automated_email_footer()}"
        ),
    )

    return {
        "status": "completed",
        "filename": filename,
        "tables_exported": len(tables_data),
        "auth_users_exported": len(auth_users),
        "documents_exported": len(documents),
        "old_backups_deleted": deleted,
        "size_bytes": len(backup_bytes),
    }
