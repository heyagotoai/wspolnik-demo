import base64
import logging
import os
import re
from datetime import date, timezone, datetime
from decimal import Decimal, ROUND_HALF_UP

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response

from api.core.config import CRON_SECRET
from api.core.email_disclaimer import automated_email_footer
from api.core.saldo_letter import COMMUNITY_NAME
from api.core.saldo_pdf import build_saldo_pdf
from api.core.security import get_current_user, require_admin, require_admin_or_manager
from api.core.supabase_client import get_supabase
from api.core.zawiadomienie_pdf import (
    ZAWIADOMIENIE_TYPE_LABELS,
    build_zawiadomienie_pdf,
)
from api.models.schemas import (
    AutoChargesConfig,
    AutoChargesConfigUpdate,
    BulkNotificationIn,
    BulkNotificationOut,
    ChargeGenerateRequest,
    ChargeGenerateSummary,
    ChargeNotificationBulkIn,
    ChargeRateCreate,
    ChargeRateOut,
    MessageOut,
    ZawiadomienieConfig,
    ZawiadomienieConfigUpdate,
)

router = APIRouter(prefix="/charges", tags=["charges"])
logger = logging.getLogger(__name__)

RATE_TYPES = ("eksploatacja", "fundusz_remontowy", "smieci")

# Stawki obliczane na podstawie metrażu (zł/m²)
AREA_BASED = {"eksploatacja", "fundusz_remontowy"}
# Stawki obliczane na podstawie liczby osób (zł/osobę)
OCCUPANT_BASED = {"smieci"}


def _validate_month(month: str) -> str:
    """Validate month format YYYY-MM-DD (first day)."""
    if not re.match(r"^\d{4}-(0[1-9]|1[0-2])-01$", month):
        raise HTTPException(
            status_code=400,
            detail="Nieprawidłowy format miesiąca. Oczekiwany: YYYY-MM-01",
        )
    return month


def _get_active_rates(sb, month: str) -> dict[str, Decimal]:
    """Fetch all charge_rates and return the active rate per type for given month.

    Returns dict like {"eksploatacja": Decimal("4.50"), "smieci": Decimal("28.00")}.
    """
    result = (
        sb.table("charge_rates")
        .select("type, rate_per_unit, valid_from")
        .order("valid_from", desc=True)
        .execute()
    )

    rates: dict[str, Decimal] = {}
    for row in result.data:
        rtype = row["type"]
        if rtype in rates:
            # Already found a newer rate for this type
            continue
        if row["valid_from"] <= month:
            rates[rtype] = Decimal(str(row["rate_per_unit"]))

    return rates


# ── Charge Generation ──────────────────────────────────────


@router.post("/generate", response_model=ChargeGenerateSummary, status_code=201)
def generate_charges(body: ChargeGenerateRequest, admin: dict = Depends(require_admin)):
    """Generate monthly charges for all apartments based on active rates."""
    month = _validate_month(body.month)
    sb = get_supabase()

    # Check for existing auto-generated charges
    existing = (
        sb.table("charges")
        .select("id")
        .eq("month", month)
        .eq("is_auto_generated", True)
        .execute()
    )
    if existing.data:
        if not body.force:
            raise HTTPException(
                status_code=409,
                detail=f"Naliczenia za {month[:7]} zostały już wygenerowane. "
                       "Użyj opcji 'Aktualizuj', aby przeliczyć naliczenia.",
            )
        # force=True → delete existing auto-generated charges before regenerating
        sb.table("charges").delete().eq("month", month).eq("is_auto_generated", True).execute()

    # Fetch active rates
    rates = _get_active_rates(sb, month)
    if not rates:
        raise HTTPException(
            status_code=400,
            detail="Brak zdefiniowanych stawek. Dodaj stawki przed generowaniem naliczeń.",
        )

    # Fetch all apartments
    apartments = (
        sb.table("apartments")
        .select("id, number, area_m2, declared_occupants, initial_balance_date")
        .order("number")
        .execute()
    )
    if not apartments.data:
        raise HTTPException(status_code=400, detail="Brak lokali w systemie.")

    charges_to_insert = []
    warnings = []
    total = Decimal("0")

    for apt in apartments.data:
        apt_id = apt["id"]
        apt_number = apt["number"]

        # Warn if generating for a month covered by initial balance
        balance_date = apt.get("initial_balance_date")
        if balance_date and month[:7] <= balance_date[:7]:
            warnings.append(
                f"Lokal {apt_number} — saldo początkowe na dzień {balance_date}, "
                f"naliczenie za {month[:7]} może powodować podwójne obciążenie"
            )
        area = Decimal(str(apt["area_m2"])) if apt.get("area_m2") else None
        occupants = apt.get("declared_occupants") or 0

        # Area-based charges
        for rtype in AREA_BASED:
            if rtype not in rates:
                continue
            if not area or area <= 0:
                warnings.append(f"Lokal {apt_number} — brak powierzchni, pominięto {rtype}")
                continue
            amount = (area * rates[rtype]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            charges_to_insert.append({
                "apartment_id": apt_id,
                "month": month,
                "type": rtype,
                "amount": float(amount),
                "is_auto_generated": True,
            })
            total += amount

        # Occupant-based charges
        for rtype in OCCUPANT_BASED:
            if rtype not in rates:
                continue
            if occupants <= 0:
                warnings.append(f"Lokal {apt_number} — 0 mieszkańców, pominięto {rtype}")
                continue
            amount = (Decimal(str(occupants)) * rates[rtype]).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            charges_to_insert.append({
                "apartment_id": apt_id,
                "month": month,
                "type": rtype,
                "amount": float(amount),
                "is_auto_generated": True,
            })
            total += amount

    if not charges_to_insert:
        raise HTTPException(
            status_code=400,
            detail="Nie udało się wygenerować żadnych naliczeń. Sprawdź dane lokali i stawki.",
        )

    # Batch insert
    sb.table("charges").insert(charges_to_insert).execute()

    return ChargeGenerateSummary(
        month=month,
        apartments_count=len(apartments.data),
        charges_created=len(charges_to_insert),
        total_amount=str(total.quantize(Decimal("0.01"))),
        warnings=warnings,
        regenerated=body.force and bool(existing.data),
    )


# ── Rates CRUD ─────────────────────────────────────────────


@router.get("/rates", response_model=list[ChargeRateOut])
def list_rates(_user: dict = Depends(require_admin_or_manager)):
    """List all charge rates (admin or manager)."""
    sb = get_supabase()
    result = (
        sb.table("charge_rates")
        .select("id, type, rate_per_unit, valid_from, created_at")
        .order("valid_from", desc=True)
        .execute()
    )
    return [
        ChargeRateOut(
            id=r["id"],
            type=r["type"],
            rate_per_unit=str(r["rate_per_unit"]),
            valid_from=str(r["valid_from"]),
            created_at=str(r["created_at"]),
        )
        for r in result.data
    ]


@router.post("/rates", response_model=ChargeRateOut, status_code=201)
def create_rate(body: ChargeRateCreate, admin: dict = Depends(require_admin)):
    """Create a new charge rate (admin only)."""
    sb = get_supabase()

    payload = {
        "type": body.type,
        "rate_per_unit": float(body.rate_per_unit),
        "valid_from": body.valid_from,
        "created_by": admin["sub"],
    }

    try:
        result = sb.table("charge_rates").insert(payload).execute()
    except Exception as e:
        if "23505" in str(e) or "unique" in str(e).lower():
            raise HTTPException(
                status_code=409,
                detail=f"Stawka typu '{body.type}' z datą {body.valid_from} już istnieje.",
            )
        raise HTTPException(status_code=500, detail="Nie udało się zapisać stawki")

    if not result.data:
        raise HTTPException(status_code=500, detail="Nie udało się zapisać stawki")

    r = result.data[0]
    return ChargeRateOut(
        id=r["id"],
        type=r["type"],
        rate_per_unit=str(r["rate_per_unit"]),
        valid_from=str(r["valid_from"]),
        created_at=str(r["created_at"]),
    )


@router.delete("/rates/{rate_id}", response_model=MessageOut)
def delete_rate(rate_id: str, _admin: dict = Depends(require_admin)):
    """Delete a charge rate (admin only)."""
    sb = get_supabase()

    check = sb.table("charge_rates").select("id").eq("id", rate_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Stawka nie znaleziona")

    sb.table("charge_rates").delete().eq("id", rate_id).execute()
    return {"detail": "Stawka została usunięta"}


# ── Auto-charge settings ──────────────────────────────────


def _get_auto_config(sb) -> AutoChargesConfig:
    """Read auto-charge settings from system_settings table."""
    result = (
        sb.table("system_settings")
        .select("key, value")
        .in_("key", ["auto_charges_enabled", "auto_charges_day"])
        .execute()
    )
    config = {"enabled": False, "day": 1}
    for row in result.data:
        if row["key"] == "auto_charges_enabled":
            config["enabled"] = row["value"] == "true"
        elif row["key"] == "auto_charges_day":
            try:
                config["day"] = int(row["value"])
            except (ValueError, TypeError):
                config["day"] = 1
    return AutoChargesConfig(**config)


@router.get("/auto-config", response_model=AutoChargesConfig)
def get_auto_config(_user: dict = Depends(require_admin_or_manager)):
    """Get auto-charge generation config (admin or manager)."""
    sb = get_supabase()
    return _get_auto_config(sb)


@router.patch("/auto-config", response_model=AutoChargesConfig)
def update_auto_config(body: AutoChargesConfigUpdate, _admin: dict = Depends(require_admin)):
    """Update auto-charge generation config (admin only)."""
    sb = get_supabase()

    if body.enabled is not None:
        sb.table("system_settings").update({
            "value": "true" if body.enabled else "false",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("key", "auto_charges_enabled").execute()

    if body.day is not None:
        sb.table("system_settings").update({
            "value": str(body.day),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("key", "auto_charges_day").execute()

    return _get_auto_config(sb)


# ── Cron endpoint ──────────────────────────────────────────


@router.post("/cron")
def cron_generate(request: Request):
    """Called daily by Vercel Cron. Generates charges if auto-enabled and day matches."""
    # Verify cron secret
    auth = request.headers.get("Authorization", "")
    if not CRON_SECRET or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    if auth.split(" ", 1)[1] != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Invalid cron secret")

    sb = get_supabase()
    config = _get_auto_config(sb)

    if not config.enabled:
        return {"status": "skipped", "reason": "auto-charges disabled"}

    today = date.today()
    if today.day != config.day:
        return {"status": "skipped", "reason": f"today is day {today.day}, configured day is {config.day}"}

    # Generate for current month
    month = today.strftime("%Y-%m-01")

    # Check if already generated
    existing = (
        sb.table("charges")
        .select("id")
        .eq("month", month)
        .eq("is_auto_generated", True)
        .execute()
    )
    if existing.data:
        return {"status": "skipped", "reason": f"charges for {month[:7]} already generated"}

    # Fetch rates and apartments
    rates = _get_active_rates(sb, month)
    if not rates:
        return {"status": "skipped", "reason": "no rates defined"}

    apartments = (
        sb.table("apartments")
        .select("id, number, area_m2, declared_occupants, initial_balance_date")
        .order("number")
        .execute()
    )
    if not apartments.data:
        return {"status": "skipped", "reason": "no apartments"}

    # Calculate charges (reuse logic from generate_charges)
    charges_to_insert = []
    total = Decimal("0")

    for apt in apartments.data:
        apt_id = apt["id"]
        area = Decimal(str(apt["area_m2"])) if apt.get("area_m2") else None
        occupants = apt.get("declared_occupants") or 0

        for rtype in AREA_BASED:
            if rtype not in rates:
                continue
            if not area or area <= 0:
                continue
            amount = (area * rates[rtype]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            charges_to_insert.append({
                "apartment_id": apt_id,
                "month": month,
                "type": rtype,
                "amount": float(amount),
                "is_auto_generated": True,
            })
            total += amount

        for rtype in OCCUPANT_BASED:
            if rtype not in rates:
                continue
            if occupants <= 0:
                continue
            amount = (Decimal(str(occupants)) * rates[rtype]).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            charges_to_insert.append({
                "apartment_id": apt_id,
                "month": month,
                "type": rtype,
                "amount": float(amount),
                "is_auto_generated": True,
            })
            total += amount

    if not charges_to_insert:
        return {"status": "skipped", "reason": "no charges to generate (check apartment data)"}

    sb.table("charges").insert(charges_to_insert).execute()

    return {
        "status": "generated",
        "month": month,
        "charges_created": len(charges_to_insert),
        "total_amount": str(total.quantize(Decimal("0.01"))),
    }


# ── Balance notification email ────────────────────────────


CHARGE_TYPE_LABELS = {
    "eksploatacja": "Eksploatacja",
    "fundusz_remontowy": "Fundusz remontowy",
    "smieci": "Śmieci",
    "inne": "Inne",
}


def _send_balance_notification_for_apartment(sb, apartment_id: str) -> tuple[str, str | None]:
    """Send balance notification for one apartment. Returns (apt_number, error_or_None)."""
    # Fetch apartment
    apt_res = (
        sb.table("apartments")
        .select("id, number, initial_balance, owner_resident_id")
        .eq("id", apartment_id)
        .execute()
    )
    if not apt_res.data:
        return apartment_id, "Lokal nie znaleziony"

    apt = apt_res.data[0]
    apt_number = str(apt["number"])

    if not apt.get("owner_resident_id"):
        return apt_number, "Lokal nie ma przypisanego właściciela"

    # Fetch owner email
    resident_res = (
        sb.table("residents")
        .select("email, full_name")
        .eq("id", apt["owner_resident_id"])
        .execute()
    )
    if not resident_res.data:
        return apt_number, "Nie znaleziono danych właściciela"

    resident = resident_res.data[0]
    if not resident.get("email"):
        return apt_number, "Właściciel nie ma adresu email"

    # Fetch charges and payments
    charges_res = (
        sb.table("charges")
        .select("amount")
        .eq("apartment_id", apartment_id)
        .execute()
    )
    total_charges = sum(Decimal(str(c["amount"])) for c in (charges_res.data or []))

    payments_res = (
        sb.table("payments")
        .select("amount")
        .eq("apartment_id", apartment_id)
        .eq("confirmed_by_admin", True)
        .execute()
    )
    total_payments = sum(Decimal(str(p["amount"])) for p in (payments_res.data or []))

    initial_balance = Decimal(str(apt.get("initial_balance") or 0))
    balance = initial_balance + total_payments - total_charges

    # Build PDF
    pdf_bytes = build_saldo_pdf(apt_number, balance)
    pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
    pdf_filename = f"saldo_lokal_{apt_number}_{date.today().strftime('%d-%m-%Y')}.pdf"

    cover_body = (
        f"Dzień dobry.\n\n"
        f"Aktualne saldo w załączonym pliku.\n\n"
        f"Z poważaniem,\n{COMMUNITY_NAME}"
        f"{automated_email_footer()}"
    )

    supabase_url = os.environ.get("SUPABASE_URL", "")
    anon_key = os.environ.get("SUPABASE_ANON_KEY", "")

    if not supabase_url or not anon_key:
        return apt_number, "Brak konfiguracji SMTP"

    try:
        resp = httpx.post(
            f"{supabase_url}/functions/v1/send-email",
            json={
                "to": resident["email"],
                "subject": f"[WM GABI] Informacja o saldzie — lokal {apt_number}",
                "body": cover_body,
                "attachment_base64": pdf_b64,
                "attachment_filename": pdf_filename,
            },
            headers={
                "Authorization": f"Bearer {anon_key}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning("Edge function returned %s: %s", resp.status_code, resp.text)
            return apt_number, "Błąd serwera pocztowego"
    except httpx.TimeoutException:
        return apt_number, "Timeout przy wysyłaniu emaila"
    except Exception as e:
        logger.warning("Failed to send balance notification for %s: %s", apt_number, e)
        return apt_number, "Błąd przy wysyłaniu emaila"

    return apt_number, None


@router.post("/balance-notification/{apartment_id}", response_model=MessageOut)
def send_balance_notification(apartment_id: str, _admin: dict = Depends(require_admin)):
    """Send balance notification email to apartment owner (admin only)."""
    sb = get_supabase()
    apt_number, error = _send_balance_notification_for_apartment(sb, apartment_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"detail": f"Powiadomienie wysłane (lokal {apt_number})"}


@router.post("/balance-notification-bulk", response_model=BulkNotificationOut)
def send_balance_notification_bulk(body: BulkNotificationIn, _admin: dict = Depends(require_admin)):
    """Send balance notifications to multiple apartments (admin only)."""
    sb = get_supabase()
    sent: list[str] = []
    failed: list[dict] = []

    for apt_id in body.apartment_ids:
        apt_number, error = _send_balance_notification_for_apartment(sb, apt_id)
        if error:
            failed.append({"number": apt_number, "error": error})
        else:
            sent.append(apt_number)

    return {"sent": sent, "failed": failed}


# ── Zawiadomienie o opłatach ──────────────────────────


DEFAULT_LEGAL_BASIS = (
    "Zarząd Wspólnoty Mieszkaniowej GABI, na podstawie uchwały nr 5/2023 "
    "z dnia 25.03.2023 oraz UCHWAŁY NR VI/74/24 RADY MIEJSKIEJ W CHOJNICACH "
    "z dnia 18.11.2024 ustanawia opłatę miesięczną:"
)


def _get_legal_basis(sb) -> str:
    """Read legal basis text from system_settings, fallback to default."""
    result = (
        sb.table("system_settings")
        .select("value")
        .eq("key", "zawiadomienie_legal_basis")
        .execute()
    )
    if result.data and result.data[0].get("value"):
        return result.data[0]["value"]
    return DEFAULT_LEGAL_BASIS


def _calculate_charges_for_apartment(
    sb, apartment_id: str, month: str | None = None,
) -> tuple[str, list[dict], Decimal, str | None]:
    """Oblicza opłatę miesięczną dla lokalu na podstawie aktywnych stawek.

    Returns: (apt_number, charges_breakdown, total, error_or_None)
    """
    # Fetch apartment
    apt_res = (
        sb.table("apartments")
        .select("id, number, area_m2, declared_occupants")
        .eq("id", apartment_id)
        .execute()
    )
    if not apt_res.data:
        return apartment_id, [], Decimal("0"), "Lokal nie znaleziony"

    apt = apt_res.data[0]
    apt_number = str(apt["number"])

    if month is None:
        month = date.today().strftime("%Y-%m-01")

    rates = _get_active_rates(sb, month)
    if not rates:
        return apt_number, [], Decimal("0"), "Brak zdefiniowanych stawek"

    area = Decimal(str(apt["area_m2"])) if apt.get("area_m2") else None
    occupants = apt.get("declared_occupants") or 0

    breakdown: list[dict] = []
    total = Decimal("0")

    for rtype in AREA_BASED:
        if rtype not in rates:
            continue
        if not area or area <= 0:
            continue
        amount = (area * rates[rtype]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        label = ZAWIADOMIENIE_TYPE_LABELS.get(rtype, rtype)
        breakdown.append({"label": label, "amount": amount})
        total += amount

    for rtype in OCCUPANT_BASED:
        if rtype not in rates:
            continue
        if occupants <= 0:
            continue
        amount = (Decimal(str(occupants)) * rates[rtype]).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        label = ZAWIADOMIENIE_TYPE_LABELS.get(rtype, rtype)
        breakdown.append({"label": label, "amount": amount})
        total += amount

    if not breakdown:
        return apt_number, [], Decimal("0"), "Brak naliczalnych opłat (sprawdź dane lokalu i stawki)"

    return apt_number, breakdown, total, None


def _parse_valid_from(valid_from: str | None) -> str:
    """Parse valid_from param (MM.YYYY) to label. Defaults to current month."""
    if valid_from and re.match(r"^\d{2}\.\d{4}$", valid_from):
        return valid_from
    now = date.today()
    return f"{now.month:02d}.{now.year}"


def _valid_from_to_month(valid_from_label: str) -> str:
    """Convert MM.YYYY label to YYYY-MM-01 for rate lookup."""
    mm, yyyy = valid_from_label.split(".")
    return f"{yyyy}-{mm}-01"


@router.get("/zawiadomienie-config", response_model=ZawiadomienieConfig)
def get_zawiadomienie_config(_user: dict = Depends(get_current_user)):
    """Get charge notification config (legal basis text)."""
    sb = get_supabase()
    return ZawiadomienieConfig(legal_basis=_get_legal_basis(sb))


@router.patch("/zawiadomienie-config", response_model=ZawiadomienieConfig)
def update_zawiadomienie_config(
    body: ZawiadomienieConfigUpdate, _admin: dict = Depends(require_admin),
):
    """Update charge notification config (admin only)."""
    sb = get_supabase()

    if body.legal_basis is not None:
        sb.table("system_settings").upsert({
            "key": "zawiadomienie_legal_basis",
            "value": body.legal_basis,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

    return ZawiadomienieConfig(legal_basis=_get_legal_basis(sb))


@router.get("/charge-notification-preview/{apartment_id}")
def preview_charge_notification(
    apartment_id: str,
    valid_from: str | None = None,
    _admin: dict = Depends(require_admin),
):
    """Download charge notification PDF for one apartment (admin only).

    Query params:
        valid_from: MM.YYYY — od kiedy obowiązują stawki (domyślnie: bieżący miesiąc)
    """
    sb = get_supabase()
    vf_label = _parse_valid_from(valid_from)
    month = _valid_from_to_month(vf_label)

    apt_number, breakdown, total, error = _calculate_charges_for_apartment(sb, apartment_id, month)
    if error:
        raise HTTPException(status_code=400, detail=error)

    legal_basis = _get_legal_basis(sb)

    pdf_bytes = build_zawiadomienie_pdf(
        apt_number, breakdown, total, vf_label, legal_basis,
    )

    filename = f"zawiadomienie_lokal_{apt_number}_{date.today().strftime('%d-%m-%Y')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _send_charge_notification_for_apartment(
    sb, apartment_id: str, legal_basis: str, valid_from_label: str, month: str,
) -> tuple[str, str | None]:
    """Send charge notification for one apartment. Returns (apt_number, error_or_None)."""
    apt_number, breakdown, total, error = _calculate_charges_for_apartment(sb, apartment_id, month)
    if error:
        return apt_number, error

    # Fetch owner
    apt_res = (
        sb.table("apartments")
        .select("owner_resident_id")
        .eq("id", apartment_id)
        .execute()
    )
    if not apt_res.data or not apt_res.data[0].get("owner_resident_id"):
        return apt_number, "Lokal nie ma przypisanego właściciela"

    resident_res = (
        sb.table("residents")
        .select("email, full_name")
        .eq("id", apt_res.data[0]["owner_resident_id"])
        .execute()
    )
    if not resident_res.data:
        return apt_number, "Nie znaleziono danych właściciela"

    resident = resident_res.data[0]
    if not resident.get("email"):
        return apt_number, "Właściciel nie ma adresu email"

    # Build PDF
    pdf_bytes = build_zawiadomienie_pdf(
        apt_number, breakdown, total, valid_from_label, legal_basis,
    )
    pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
    pdf_filename = f"zawiadomienie_lokal_{apt_number}_{date.today().strftime('%d-%m-%Y')}.pdf"

    cover_body = (
        f"Dzień dobry.\n\n"
        f"Zawiadomienie o opłatach w załączonym pliku.\n\n"
        f"Z poważaniem,\n{COMMUNITY_NAME}"
        f"{automated_email_footer()}"
    )

    supabase_url = os.environ.get("SUPABASE_URL", "")
    anon_key = os.environ.get("SUPABASE_ANON_KEY", "")

    if not supabase_url or not anon_key:
        return apt_number, "Brak konfiguracji SMTP"

    try:
        resp = httpx.post(
            f"{supabase_url}/functions/v1/send-email",
            json={
                "to": resident["email"],
                "subject": f"[WM GABI] Zawiadomienie o opłatach — lokal {apt_number}",
                "body": cover_body,
                "attachment_base64": pdf_b64,
                "attachment_filename": pdf_filename,
            },
            headers={
                "Authorization": f"Bearer {anon_key}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning("Edge function returned %s: %s", resp.status_code, resp.text)
            return apt_number, "Błąd serwera pocztowego"
    except httpx.TimeoutException:
        return apt_number, "Timeout przy wysyłaniu emaila"
    except Exception as e:
        logger.warning("Failed to send charge notification for %s: %s", apt_number, e)
        return apt_number, "Błąd przy wysyłaniu emaila"

    return apt_number, None


@router.post("/charge-notification/{apartment_id}", response_model=MessageOut)
def send_charge_notification(
    apartment_id: str,
    valid_from: str | None = None,
    _admin: dict = Depends(require_admin),
):
    """Send charge notification email to apartment owner (admin only).

    Query params:
        valid_from: MM.YYYY — od kiedy obowiązują stawki (domyślnie: bieżący miesiąc)
    """
    sb = get_supabase()
    vf_label = _parse_valid_from(valid_from)
    month = _valid_from_to_month(vf_label)
    legal_basis = _get_legal_basis(sb)

    apt_number, error = _send_charge_notification_for_apartment(
        sb, apartment_id, legal_basis, vf_label, month,
    )
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"detail": f"Zawiadomienie wysłane (lokal {apt_number})"}


@router.post("/charge-notification-bulk", response_model=BulkNotificationOut)
def send_charge_notification_bulk(body: ChargeNotificationBulkIn, _admin: dict = Depends(require_admin)):
    """Send charge notifications to multiple apartments (admin only).

    Body:
        apartment_ids: list of apartment UUIDs
        valid_from: MM.YYYY — od kiedy obowiązują stawki (domyślnie: bieżący miesiąc)
    """
    sb = get_supabase()
    vf_label = _parse_valid_from(body.valid_from)
    month = _valid_from_to_month(vf_label)
    legal_basis = _get_legal_basis(sb)

    sent: list[str] = []
    failed: list[dict] = []

    for apt_id in body.apartment_ids:
        apt_number, error = _send_charge_notification_for_apartment(
            sb, apt_id, legal_basis, vf_label, month,
        )
        if error:
            failed.append({"number": apt_number, "error": error})
        else:
            sent.append(apt_number)

    return {"sent": sent, "failed": failed}
