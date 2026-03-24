"""Testy generowania PDF salda."""

from datetime import datetime
from decimal import Decimal

from api.core.saldo_letter import PL
from api.core.saldo_pdf import build_saldo_pdf


def _is_pdf(data: bytes) -> bool:
    return data[:4] == b"%PDF"


def test_pdf_is_valid_bytes_for_debt():
    fixed = datetime(2026, 3, 24, 12, 0, 0, tzinfo=PL)
    result = build_saldo_pdf("5", Decimal("-120.50"), issue_at=fixed)
    assert _is_pdf(result)
    assert len(result) > 1000


def test_pdf_is_valid_bytes_for_overpayment():
    fixed = datetime(2026, 3, 24, 12, 0, 0, tzinfo=PL)
    result = build_saldo_pdf("12", Decimal("55.00"), issue_at=fixed)
    assert _is_pdf(result)
    assert len(result) > 1000


def test_pdf_is_valid_bytes_for_zero():
    fixed = datetime(2026, 3, 24, 12, 0, 0, tzinfo=PL)
    result = build_saldo_pdf("3", Decimal("0"), issue_at=fixed)
    assert _is_pdf(result)
    assert len(result) > 1000


def test_different_balances_produce_different_pdfs():
    """Zadłużenie vs nadpłata — inny blok warunkowy, różna długość."""
    fixed = datetime(2026, 3, 24, 12, 0, 0, tzinfo=PL)
    debt = build_saldo_pdf("1", Decimal("-100.00"), issue_at=fixed)
    credit = build_saldo_pdf("1", Decimal("100.00"), issue_at=fixed)
    assert debt != credit
