"""Billing groups — grupy rozliczeniowe lokali."""

import logging
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException

from api.core.security import get_current_user, require_admin, require_admin_or_manager
from api.core.supabase_client import get_supabase
from api.models.schemas import (
    BillingGroupAssignApartments,
    BillingGroupBalanceOut,
    BillingGroupCreate,
    BillingGroupOut,
    BillingGroupPaymentSplit,
    BillingGroupUpdate,
    MessageOut,
)

router = APIRouter(prefix="/billing-groups", tags=["billing-groups"])
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _get_group_or_404(sb, group_id: str) -> dict:
    res = sb.table("billing_groups").select("*").eq("id", group_id).maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Grupa rozliczeniowa nie znaleziona")
    return res.data


def _get_group_apartments(sb, group_id: str) -> list[dict]:
    res = (
        sb.table("apartments")
        .select("id, number, area_m2, owner_resident_id, initial_balance, declared_occupants")
        .eq("billing_group_id", group_id)
        .order("number")
        .execute()
    )
    return res.data or []


def _enrich_apartments_with_owner(sb, apartments: list[dict]) -> list[dict]:
    """Add owner_name to each apartment dict."""
    owner_ids = list({a["owner_resident_id"] for a in apartments if a.get("owner_resident_id")})
    owners_map: dict[str, str] = {}
    if owner_ids:
        res = sb.table("residents").select("id, full_name").in_("id", owner_ids).execute()
        owners_map = {r["id"]: r["full_name"] for r in (res.data or [])}

    for apt in apartments:
        apt["owner_name"] = owners_map.get(apt.get("owner_resident_id"), None)
    return apartments


def _compute_apartment_balance(sb, apartment_id: str) -> dict:
    """Compute balance for a single apartment."""
    apt_res = (
        sb.table("apartments")
        .select("id, number, initial_balance")
        .eq("id", apartment_id)
        .single()
        .execute()
    )
    apt = apt_res.data

    charges_res = (
        sb.table("charges")
        .select("amount")
        .eq("apartment_id", apartment_id)
        .execute()
    )
    payments_res = (
        sb.table("payments")
        .select("amount")
        .eq("apartment_id", apartment_id)
        .eq("confirmed_by_admin", True)
        .execute()
    )

    initial = Decimal(str(apt.get("initial_balance") or 0))
    total_charges = sum(Decimal(str(c["amount"])) for c in (charges_res.data or []))
    total_payments = sum(Decimal(str(p["amount"])) for p in (payments_res.data or []))
    balance = initial + total_payments - total_charges

    return {
        "id": apt["id"],
        "number": apt["number"],
        "initial_balance": str(initial),
        "total_charges": str(total_charges),
        "total_payments": str(total_payments),
        "balance": str(balance),
    }


# ──────────────────────────────────────────────
# CRUD
# ──────────────────────────────────────────────

@router.get("", response_model=list[BillingGroupOut])
def list_billing_groups(_user: dict = Depends(require_admin_or_manager)):
    sb = get_supabase()
    groups = sb.table("billing_groups").select("*").order("name").execute()

    result = []
    for g in groups.data or []:
        apartments = _get_group_apartments(sb, g["id"])
        apartments = _enrich_apartments_with_owner(sb, apartments)
        result.append({
            "id": g["id"],
            "name": g["name"],
            "apartments": apartments,
            "created_at": g["created_at"],
        })
    return result


@router.post("", response_model=BillingGroupOut, status_code=201)
def create_billing_group(
    body: BillingGroupCreate,
    _user: dict = Depends(require_admin),
):
    sb = get_supabase()
    res = sb.table("billing_groups").insert({"name": body.name}).execute()
    group = res.data[0]
    return {
        "id": group["id"],
        "name": group["name"],
        "apartments": [],
        "created_at": group["created_at"],
    }


@router.patch("/{group_id}", response_model=BillingGroupOut)
def update_billing_group(
    group_id: str,
    body: BillingGroupUpdate,
    _user: dict = Depends(require_admin),
):
    sb = get_supabase()
    _get_group_or_404(sb, group_id)

    res = (
        sb.table("billing_groups")
        .update({"name": body.name})
        .eq("id", group_id)
        .execute()
    )
    group = res.data[0]
    apartments = _get_group_apartments(sb, group_id)
    apartments = _enrich_apartments_with_owner(sb, apartments)
    return {
        "id": group["id"],
        "name": group["name"],
        "apartments": apartments,
        "created_at": group["created_at"],
    }


@router.delete("/{group_id}", response_model=MessageOut)
def delete_billing_group(
    group_id: str,
    _user: dict = Depends(require_admin),
):
    sb = get_supabase()
    _get_group_or_404(sb, group_id)

    # Unassign apartments first (ON DELETE SET NULL handles this, but be explicit)
    sb.table("apartments").update({"billing_group_id": None}).eq("billing_group_id", group_id).execute()
    sb.table("billing_groups").delete().eq("id", group_id).execute()
    return {"detail": "Grupa rozliczeniowa usunięta"}


# ──────────────────────────────────────────────
# Apartment assignment
# ──────────────────────────────────────────────

@router.post("/{group_id}/apartments", response_model=BillingGroupOut)
def assign_apartments(
    group_id: str,
    body: BillingGroupAssignApartments,
    _user: dict = Depends(require_admin),
):
    sb = get_supabase()
    group = _get_group_or_404(sb, group_id)

    # Validate apartments exist
    apts_res = sb.table("apartments").select("id, number").in_("id", body.apartment_ids).execute()
    found_ids = {a["id"] for a in (apts_res.data or [])}
    missing = set(body.apartment_ids) - found_ids
    if missing:
        raise HTTPException(status_code=400, detail=f"Nie znaleziono lokali: {missing}")

    # Assign
    for apt_id in body.apartment_ids:
        sb.table("apartments").update({"billing_group_id": group_id}).eq("id", apt_id).execute()

    apartments = _get_group_apartments(sb, group_id)
    apartments = _enrich_apartments_with_owner(sb, apartments)
    return {
        "id": group["id"],
        "name": group["name"],
        "apartments": apartments,
        "created_at": group["created_at"],
    }


@router.delete("/{group_id}/apartments/{apartment_id}", response_model=MessageOut)
def remove_apartment(
    group_id: str,
    apartment_id: str,
    _user: dict = Depends(require_admin),
):
    sb = get_supabase()
    _get_group_or_404(sb, group_id)

    # Verify apartment is in this group
    apt_res = (
        sb.table("apartments")
        .select("id, number")
        .eq("id", apartment_id)
        .eq("billing_group_id", group_id)
        .maybe_single()
        .execute()
    )
    if not apt_res.data:
        raise HTTPException(status_code=404, detail="Lokal nie należy do tej grupy")

    sb.table("apartments").update({"billing_group_id": None}).eq("id", apartment_id).execute()
    return {"detail": f"Lokal {apt_res.data['number']} usunięty z grupy"}


# ──────────────────────────────────────────────
# Payment splitting
# ──────────────────────────────────────────────

@router.post("/{group_id}/split-payment", status_code=201)
def split_payment(
    group_id: str,
    body: BillingGroupPaymentSplit,
    _user: dict = Depends(require_admin),
):
    sb = get_supabase()
    group = _get_group_or_404(sb, group_id)
    apartments = _get_group_apartments(sb, group_id)

    if not apartments:
        raise HTTPException(status_code=400, detail="Grupa nie ma przypisanych lokali")

    # Determine split month
    if body.split_month:
        split_month = body.split_month
    else:
        # Default: month of payment_date
        try:
            dt = datetime.strptime(body.payment_date, "%Y-%m-%d")
            split_month = dt.strftime("%Y-%m-01")
        except ValueError:
            raise HTTPException(status_code=400, detail="Nieprawidłowy format daty (YYYY-MM-DD)")

    # Get charges for split_month per apartment
    apt_ids = [a["id"] for a in apartments]
    charges_res = (
        sb.table("charges")
        .select("apartment_id, amount")
        .in_("apartment_id", apt_ids)
        .eq("month", split_month)
        .execute()
    )

    # Sum charges per apartment
    apt_charges: dict[str, Decimal] = {aid: Decimal("0") for aid in apt_ids}
    for c in (charges_res.data or []):
        apt_charges[c["apartment_id"]] += Decimal(str(c["amount"]))

    total_charges = sum(apt_charges.values())
    total_amount = body.amount

    # Calculate proportions
    if total_charges > 0:
        proportions = {aid: ch / total_charges for aid, ch in apt_charges.items()}
    else:
        # Equal split if no charges
        n = len(apt_ids)
        proportions = {aid: Decimal("1") / Decimal(str(n)) for aid in apt_ids}

    # Calculate split amounts with rounding correction
    split_amounts: dict[str, Decimal] = {}
    running_sum = Decimal("0")
    apt_list = list(proportions.keys())

    for i, aid in enumerate(apt_list):
        if i == len(apt_list) - 1:
            # Last apartment gets the remainder to avoid rounding drift
            split_amounts[aid] = total_amount - running_sum
        else:
            amt = (total_amount * proportions[aid]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            split_amounts[aid] = amt
            running_sum += amt

    # Create parent payment
    parent_data = {
        "apartment_id": None,
        "billing_group_id": group_id,
        "amount": str(total_amount),
        "payment_date": body.payment_date,
        "title": body.title or f"Wpłata grupowa - {group['name']}",
        "confirmed_by_admin": True,
        "matched_automatically": False,
    }
    parent_res = sb.table("payments").insert(parent_data).execute()
    parent_id = parent_res.data[0]["id"]

    # Create child payments
    children = []
    apt_number_map = {a["id"]: a["number"] for a in apartments}
    for aid, amt in split_amounts.items():
        if amt == 0:
            continue
        child_data = {
            "apartment_id": aid,
            "billing_group_id": group_id,
            "parent_payment_id": parent_id,
            "amount": str(amt),
            "payment_date": body.payment_date,
            "title": f"Rozbicie wpłaty - lokal {apt_number_map[aid]}",
            "confirmed_by_admin": True,
            "matched_automatically": True,
        }
        child_res = sb.table("payments").insert(child_data).execute()
        children.append({
            "apartment_id": aid,
            "apartment_number": apt_number_map[aid],
            "amount": str(amt),
        })

    return {
        "parent_payment_id": parent_id,
        "total_amount": str(total_amount),
        "split_month": split_month,
        "children": children,
    }


# ──────────────────────────────────────────────
# Balance
# ──────────────────────────────────────────────

@router.get("/{group_id}/balance", response_model=BillingGroupBalanceOut)
def get_group_balance(
    group_id: str,
    user: dict = Depends(get_current_user),
):
    sb = get_supabase()
    group = _get_group_or_404(sb, group_id)
    apartments = _get_group_apartments(sb, group_id)

    if not apartments:
        return {
            "group_id": group["id"],
            "group_name": group["name"],
            "combined_balance": "0",
            "apartments": [],
        }

    # Check access: admin/manager or resident with apartment in this group
    user_id = user.get("sub")
    role_res = sb.table("residents").select("role").eq("id", user_id).maybe_single().execute()
    role = role_res.data.get("role") if role_res.data else None

    if role not in ("admin", "manager"):
        # Resident — check if they own any apartment in this group
        owned = sb.table("apartments").select("id").eq("billing_group_id", group_id).eq("owner_resident_id", user_id).execute()
        if not (owned.data):
            raise HTTPException(status_code=403, detail="Brak dostępu do tej grupy")

    # Compute per-apartment balances
    apt_balances = []
    combined = Decimal("0")
    for apt in apartments:
        bal = _compute_apartment_balance(sb, apt["id"])
        apt_balances.append(bal)
        combined += Decimal(bal["balance"])

    return {
        "group_id": group["id"],
        "group_name": group["name"],
        "combined_balance": str(combined),
        "apartments": apt_balances,
    }
