"""Wpłaty — ręczna korekta zapisów (admin).

Pozwala poprawić błędy automatycznego dopasowania z importu bankowego:
przeniesienie wpłaty do właściwego lokalu, zmiana kwoty/daty, usunięcie,
oraz ręczne dodanie wpłaty (np. gotówka). Operacje logowane przez triggery
audytu na tabeli `payments`.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from api.core.security import require_admin
from api.core.supabase_client import get_supabase
from api.models.schemas import (
    MessageOut,
    PaymentCreate,
    PaymentOut,
    PaymentUpdate,
)

router = APIRouter(prefix="/payments", tags=["payments"])
logger = logging.getLogger(__name__)

# Tytuł rozpoznający ręcznie dodaną wpłatę (gdy admin nie poda własnego)
MANUAL_TITLE = "Wpłata dodana ręcznie"


def _serialize(p: dict) -> PaymentOut:
    return PaymentOut(
        id=p["id"],
        apartment_id=p.get("apartment_id"),
        amount=str(p["amount"]),
        payment_date=str(p["payment_date"]),
        title=p.get("title"),
        confirmed_by_admin=bool(p.get("confirmed_by_admin")),
        matched_automatically=bool(p.get("matched_automatically")),
        parent_payment_id=p.get("parent_payment_id"),
        billing_group_id=p.get("billing_group_id"),
        created_at=str(p.get("created_at")),
    )


def _get_payment_or_404(sb, payment_id: str) -> dict:
    res = sb.table("payments").select("*").eq("id", payment_id).maybe_single().execute()
    if not res or not res.data:
        raise HTTPException(status_code=404, detail="Wpłata nie znaleziona")
    return res.data


def _is_split_involved(payment: dict) -> bool:
    """Czy wpłata jest częścią rozbicia zbiorczego.

    - dziecko rozbicia: ma ustawione `parent_payment_id`,
    - rodzic rozbicia: nie ma przypisanego lokalu (`apartment_id IS NULL`) —
      wpłaty proste (import pojedynczy, dodanie ręczne) zawsze mają lokal.
    """
    if payment.get("parent_payment_id"):
        return True
    return payment.get("apartment_id") is None


def _get_apartment(sb, apartment_id: str) -> dict:
    res = (
        sb.table("apartments")
        .select("id, billing_group_id")
        .eq("id", apartment_id)
        .maybe_single()
        .execute()
    )
    if not res or not res.data:
        raise HTTPException(status_code=404, detail="Lokal nie znaleziony")
    return res.data


@router.get("", response_model=list[PaymentOut])
def list_payments(apartment_id: str, _admin: dict = Depends(require_admin)):
    """Lista wpłat danego lokalu (admin). Najnowsze pierwsze."""
    sb = get_supabase()
    res = (
        sb.table("payments")
        .select("*")
        .eq("apartment_id", apartment_id)
        .order("payment_date", desc=True)
        .execute()
    )
    return [_serialize(p) for p in (res.data or [])]


@router.post("", response_model=PaymentOut, status_code=201)
def create_payment(body: PaymentCreate, _admin: dict = Depends(require_admin)):
    """Ręczne dodanie wpłaty do lokalu (np. gotówka, korekta)."""
    sb = get_supabase()
    apt = _get_apartment(sb, body.apartment_id)

    data = {
        "apartment_id": body.apartment_id,
        "billing_group_id": apt.get("billing_group_id"),
        "amount": str(body.amount),
        "payment_date": body.payment_date,
        "title": (body.title or "").strip() or MANUAL_TITLE,
        "confirmed_by_admin": True,
        "matched_automatically": False,
    }
    res = sb.table("payments").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Nie udało się zapisać wpłaty")
    return _serialize(res.data[0])


@router.patch("/{payment_id}", response_model=PaymentOut)
def update_payment(
    payment_id: str, body: PaymentUpdate, _admin: dict = Depends(require_admin)
):
    """Edycja wpłaty: kwota, data, tytuł, przeniesienie do innego lokalu.

    Wpłaty będące częścią rozbicia zbiorczego (parent/child) są zablokowane —
    należy usunąć całą wpłatę nadrzędną i wprowadzić ponownie.
    """
    sb = get_supabase()
    payment = _get_payment_or_404(sb, payment_id)

    if _is_split_involved(payment):
        raise HTTPException(
            status_code=409,
            detail=(
                "Ta wpłata jest częścią rozbicia wpłaty zbiorczej. "
                "Usuń całą wpłatę i wprowadź ją ponownie zamiast edytować pojedyncze rozbicie."
            ),
        )

    update: dict = {}
    if body.amount is not None:
        update["amount"] = str(body.amount)
    if body.payment_date is not None:
        update["payment_date"] = body.payment_date
    if body.title is not None:
        update["title"] = body.title.strip() or None
    if body.apartment_id is not None and body.apartment_id != payment.get("apartment_id"):
        apt = _get_apartment(sb, body.apartment_id)
        update["apartment_id"] = body.apartment_id
        # billing_group_id podąża za lokalem docelowym
        update["billing_group_id"] = apt.get("billing_group_id")

    if not update:
        raise HTTPException(status_code=400, detail="Brak zmian do zapisania")

    res = sb.table("payments").update(update).eq("id", payment_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Nie udało się zapisać zmian")
    return _serialize(res.data[0])


@router.delete("/{payment_id}", response_model=MessageOut)
def delete_payment(payment_id: str, _admin: dict = Depends(require_admin)):
    """Usunięcie wpłaty (admin).

    Jeśli wpłata jest częścią rozbicia zbiorczego, usuwana jest cała wpłata
    nadrzędna wraz z rozbiciami (ON DELETE CASCADE).
    """
    sb = get_supabase()
    payment = _get_payment_or_404(sb, payment_id)

    # Rozbicie: usuwamy rodzica → kaskadowo znikają wszystkie rozbicia
    target_id = payment.get("parent_payment_id") or payment_id
    sb.table("payments").delete().eq("id", target_id).execute()

    if target_id != payment_id:
        return {"detail": "Usunięto wpłatę zbiorczą wraz z rozbiciami"}
    return {"detail": "Wpłata została usunięta"}
