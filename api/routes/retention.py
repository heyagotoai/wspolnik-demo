"""Retencja danych finansowych — max 5 lat (RODO/GDPR).

Kwartalny cron (GitHub Actions) — usuwa z tabel finansowych rekordy starsze niż 5 lat.
Tabele: charges, payments, bank_statements, audit_log.

Przed usunięciem naliczeń i wpłat aktualizuje initial_balance lokali,
aby saldo pozostało spójne po usunięciu starych rekordów.

Wysyła email do adminów/zarządców z raportem.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
from fastapi import APIRouter, HTTPException, Request

from api.core.config import CRON_SECRET, SUPABASE_URL
from api.core.email_disclaimer import automated_email_footer
from api.core.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/retention", tags=["retention"])

RETENTION_YEARS = 5


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
        logger.warning("Retention cron: nie udało się pobrać listy odbiorców: %s", e)
        return []


def _send_notification(subject: str, body: str) -> None:
    sb = get_supabase()
    emails = _get_admin_and_manager_emails(sb)
    if not emails:
        logger.warning("Retention cron: brak odbiorców powiadomienia")
        return
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    if not SUPABASE_URL or not anon_key:
        logger.warning("Retention cron: brak konfiguracji email")
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
            logger.warning(
                "Retention cron: nie udało się wysłać powiadomienia do %s: %s",
                email, e,
            )


def _carry_forward_balances(sb, cutoff_iso: str) -> int:
    """Przenieś efekt starych naliczeń i wpłat do initial_balance lokali.

    Dla każdego lokalu:
      new_initial_balance = old_initial_balance + old_payments - old_charges
      initial_balance_date = cutoff_date

    Zwraca liczbę zaktualizowanych lokali.
    """
    apartments = sb.table("apartments").select("id, initial_balance").execute()
    if not apartments.data:
        return 0

    updated = 0
    for apt in apartments.data:
        apt_id = apt["id"]

        old_charges_res = (
            sb.table("charges")
            .select("amount")
            .eq("apartment_id", apt_id)
            .lt("month", cutoff_iso)
            .execute()
        )
        old_charges = sum(
            Decimal(str(c["amount"])) for c in (old_charges_res.data or [])
        )

        old_payments_res = (
            sb.table("payments")
            .select("amount")
            .eq("apartment_id", apt_id)
            .lt("payment_date", cutoff_iso)
            .execute()
        )
        old_payments = sum(
            Decimal(str(p["amount"])) for p in (old_payments_res.data or [])
        )

        if old_charges == 0 and old_payments == 0:
            continue

        current_balance = Decimal(str(apt.get("initial_balance") or 0))
        new_balance = current_balance + old_payments - old_charges

        sb.table("apartments").update({
            "initial_balance": float(new_balance),
            "initial_balance_date": cutoff_iso[:10],
        }).eq("id", apt_id).execute()

        logger.info(
            "Retention: lokal %s — initial_balance: %s → %s (charges: -%s, payments: +%s)",
            apt_id, current_balance, new_balance, old_charges, old_payments,
        )
        updated += 1

    return updated


def _count_and_delete(sb, table: str, date_column: str, cutoff_iso: str) -> int:
    """Policz i usuń rekordy starsze niż cutoff. Zwraca liczbę usuniętych."""
    to_delete = (
        sb.table(table)
        .select("id", count="exact")
        .lt(date_column, cutoff_iso)
        .execute()
    )
    deleted_count = to_delete.count or 0

    if deleted_count > 0:
        sb.table(table).delete().lt(date_column, cutoff_iso).execute()
        logger.info(
            "Retention cron: usunięto %d rekordów z %s (starszych niż %d lat)",
            deleted_count, table, RETENTION_YEARS,
        )

    return deleted_count


def _count_expiring(sb, table: str, date_column: str, cutoff_warning_iso: str, cutoff_delete_iso: str) -> int:
    """Policz rekordy, które wygasną przy następnym uruchomieniu."""
    try:
        expiring = (
            sb.table(table)
            .select("id", count="exact")
            .lt(date_column, cutoff_warning_iso)
            .gte(date_column, cutoff_delete_iso)
            .execute()
        )
        return expiring.count or 0
    except Exception as e:
        logger.warning("Retention cron: błąd odczytu expiring z %s: %s", table, e)
        return 0


def _delete_bank_statements(sb, cutoff_iso: str) -> int:
    """Usuń bank_statements starsze niż cutoff (fallback created_at gdy brak statement_date)."""
    # Rekordy z statement_date
    count_dated = _count_and_delete(sb, "bank_statements", "statement_date", cutoff_iso)

    # Rekordy z NULL statement_date — fallback na created_at
    null_date_res = (
        sb.table("bank_statements")
        .select("id", count="exact")
        .is_("statement_date", "null")
        .lt("created_at", cutoff_iso)
        .execute()
    )
    null_count = null_date_res.count or 0
    if null_count > 0:
        sb.table("bank_statements").delete().is_("statement_date", "null").lt("created_at", cutoff_iso).execute()
        logger.info(
            "Retention cron: usunięto %d bank_statements bez statement_date (created_at < cutoff)",
            null_count,
        )

    return count_dated + null_count


@router.api_route("/cron", methods=["GET", "POST"])
def retention_cron(request: Request):
    """Kwartalny cron — usuwa dane finansowe starsze niż 5 lat (RODO).

    1. Przenosi efekt starych naliczeń/wpłat do initial_balance lokali (spójność salda).
    2. Usuwa stare rekordy z charges, payments, bank_statements, audit_log.
    3. Wysyła raport do adminów i zarządców.
    """
    _verify_cron(request)

    sb = get_supabase()
    now = datetime.now(timezone.utc)
    cutoff_delete = now - timedelta(days=RETENTION_YEARS * 365)
    cutoff_warning = now - timedelta(days=RETENTION_YEARS * 365 - 90)
    cutoff_iso = cutoff_delete.isoformat()
    warning_iso = cutoff_warning.isoformat()

    results = {}

    # 1. Carry forward — przeniesienie salda PRZED usunięciem
    try:
        apartments_updated = _carry_forward_balances(sb, cutoff_iso)
    except Exception as e:
        logger.error("Retention cron: błąd carry_forward_balances: %s", e)
        apartments_updated = 0
        results["_carry_forward_error"] = str(e)

    # 2. Usuwanie starych rekordów
    # charges
    try:
        expiring = _count_expiring(sb, "charges", "month", warning_iso, cutoff_iso)
        deleted = _count_and_delete(sb, "charges", "month", cutoff_iso)
        results["charges"] = {"deleted": deleted, "expiring": expiring}
    except Exception as e:
        logger.warning("Retention cron: błąd charges: %s", e)
        results["charges"] = {"deleted": 0, "expiring": 0, "error": str(e)}

    # payments
    try:
        expiring = _count_expiring(sb, "payments", "payment_date", warning_iso, cutoff_iso)
        deleted = _count_and_delete(sb, "payments", "payment_date", cutoff_iso)
        results["payments"] = {"deleted": deleted, "expiring": expiring}
    except Exception as e:
        logger.warning("Retention cron: błąd payments: %s", e)
        results["payments"] = {"deleted": 0, "expiring": 0, "error": str(e)}

    # bank_statements (z fallback na created_at dla NULL statement_date)
    try:
        expiring = _count_expiring(sb, "bank_statements", "statement_date", warning_iso, cutoff_iso)
        deleted = _delete_bank_statements(sb, cutoff_iso)
        results["bank_statements"] = {"deleted": deleted, "expiring": expiring}
    except Exception as e:
        logger.warning("Retention cron: błąd bank_statements: %s", e)
        results["bank_statements"] = {"deleted": 0, "expiring": 0, "error": str(e)}

    # audit_log
    try:
        expiring = _count_expiring(sb, "audit_log", "created_at", warning_iso, cutoff_iso)
        deleted = _count_and_delete(sb, "audit_log", "created_at", cutoff_iso)
        results["audit_log"] = {"deleted": deleted, "expiring": expiring}
    except Exception as e:
        logger.warning("Retention cron: błąd audit_log: %s", e)
        results["audit_log"] = {"deleted": 0, "expiring": 0, "error": str(e)}

    # 3. Raport
    total_deleted = sum(r.get("deleted", 0) for r in results.values() if isinstance(r, dict))
    total_expiring = sum(r.get("expiring", 0) for r in results.values() if isinstance(r, dict))

    table_lines = []
    for table, r in results.items():
        if table.startswith("_"):
            continue
        if r.get("error"):
            table_lines.append(f"  • {table}: BŁĄD — {r['error']}")
        else:
            table_lines.append(f"  • {table}: usunięto {r['deleted']}, wygaśnie wkrótce: {r['expiring']}")

    carry_info = f"Zaktualizowano initial_balance: {apartments_updated} lokali\n" if apartments_updated > 0 else ""
    carry_error = (
        f"\n⚠️  BŁĄD carry-forward salda: {results.get('_carry_forward_error')}\n"
        if "_carry_forward_error" in results else ""
    )

    expiry_warning = (
        f"\n⚠️  Uwaga: {total_expiring} rekordów wygaśnie przy następnym uruchomieniu (za ~90 dni).\n"
        if total_expiring > 0 else ""
    )

    _send_notification(
        subject="[WM GABI] Retencja danych finansowych",
        body=(
            f"Kwartalny cron retencji danych finansowych — {now.strftime('%Y-%m-%d')}.\n\n"
            f"Retencja: {RETENTION_YEARS} lat\n"
            f"{carry_info}"
            f"Łącznie usunięto: {total_deleted} rekordów\n\n"
            f"Szczegóły:\n"
            + "\n".join(table_lines)
            + f"\n{carry_error}"
            + f"{expiry_warning}"
            + f"\n{automated_email_footer()}"
        ),
    )

    return {
        "total_deleted": total_deleted,
        "total_expiring": total_expiring,
        "apartments_balance_updated": apartments_updated,
        "details": {k: v for k, v in results.items() if not k.startswith("_")},
    }
