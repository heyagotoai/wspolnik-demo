import logging
import os
import re
from datetime import date, timezone, datetime
from decimal import Decimal, ROUND_HALF_UP

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from api.core.config import CRON_SECRET
from api.core.saldo_letter import build_saldo_letter_plain_text
from api.core.security import get_current_user, require_admin
from api.core.supabase_client import get_supabase
from api.models.schemas import (
    AutoChargesConfig,
    AutoChargesConfigUpdate,
    ChargeGenerateRequest,
    ChargeGenerateSummary,
    ChargeRateCreate,
    ChargeRateOut,
    MessageOut,
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
def list_rates(_user: dict = Depends(get_current_user)):
    """List all charge rates (any logged-in user)."""
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
def get_auto_config(_user: dict = Depends(get_current_user)):
    """Get auto-charge generation config."""
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


@router.post("/balance-notification/{apartment_id}", response_model=MessageOut)
def send_balance_notification(apartment_id: str, _admin: dict = Depends(require_admin)):
    """Send balance notification email to apartment owner (admin only)."""
    sb = get_supabase()

    # Fetch apartment
    apt_res = (
        sb.table("apartments")
        .select("id, number, initial_balance, owner_resident_id")
        .eq("id", apartment_id)
        .execute()
    )
    if not apt_res.data:
        raise HTTPException(status_code=404, detail="Lokal nie znaleziony")

    apt = apt_res.data[0]
    if not apt.get("owner_resident_id"):
        raise HTTPException(status_code=400, detail="Lokal nie ma przypisanego właściciela")

    # Fetch owner email
    resident_res = (
        sb.table("residents")
        .select("email, full_name")
        .eq("id", apt["owner_resident_id"])
        .execute()
    )
    if not resident_res.data:
        raise HTTPException(status_code=400, detail="Nie znaleziono danych właściciela")

    resident = resident_res.data[0]

    # Fetch charges
    charges_res = (
        sb.table("charges")
        .select("type, amount")
        .eq("apartment_id", apartment_id)
        .execute()
    )
    total_charges = sum(Decimal(str(c["amount"])) for c in (charges_res.data or []))

    # Fetch confirmed payments
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

    # Treść jak wydruk SALDO (panel admin → Drukuj saldo)
    body = build_saldo_letter_plain_text(str(apt["number"]), balance)

    # Send via Edge Function
    supabase_url = os.environ.get("SUPABASE_URL", "")
    anon_key = os.environ.get("SUPABASE_ANON_KEY", "")

    if not supabase_url or not anon_key:
        raise HTTPException(status_code=500, detail="Brak konfiguracji SMTP (Supabase URL/klucz)")

    try:
        resp = httpx.post(
            f"{supabase_url}/functions/v1/send-email",
            json={
                "to": resident["email"],
                "subject": f"[WM GABI] Informacja o saldzie — lokal {apt['number']}",
                "body": body,
            },
            headers={
                "Authorization": f"Bearer {anon_key}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning("Edge function returned %s: %s", resp.status_code, resp.text)
            raise HTTPException(
                status_code=502,
                detail="Nie udało się wysłać emaila (błąd serwera pocztowego)",
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout przy wysyłaniu emaila")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Failed to send balance notification: %s", e)
        raise HTTPException(status_code=500, detail="Błąd przy wysyłaniu emaila")

    return {"detail": f"Powiadomienie wysłane na {resident['email']}"}
