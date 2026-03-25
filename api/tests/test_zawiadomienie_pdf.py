"""Testy generowania PDF zawiadomienia o opłatach."""

from datetime import datetime
from decimal import Decimal

from api.core.saldo_letter import PL
from api.core.zawiadomienie_pdf import build_zawiadomienie_pdf


SAMPLE_BREAKDOWN = [
    {"label": "Opłata eksploatacyjna", "amount": Decimal("99.22")},
    {"label": "Fundusz remontowy", "amount": Decimal("81.18")},
    {"label": "Wywóz nieczystości stałych", "amount": Decimal("32.00")},
]
SAMPLE_TOTAL = Decimal("212.40")
SAMPLE_LEGAL = (
    "Zarząd Wspólnoty Mieszkaniowej GABI, na podstawie uchwały nr 5/2023 "
    "z dnia 25.03.2023 ustanawia opłatę miesięczną:"
)


def _is_pdf(data: bytes) -> bool:
    return data[:4] == b"%PDF"


def test_pdf_is_valid_bytes():
    fixed = datetime(2026, 3, 25, 12, 0, 0, tzinfo=PL)
    result = build_zawiadomienie_pdf(
        "7", SAMPLE_BREAKDOWN, SAMPLE_TOTAL, "12.2025", SAMPLE_LEGAL, issue_at=fixed,
    )
    assert _is_pdf(result)
    assert len(result) > 1000


def test_pdf_with_single_charge_type():
    fixed = datetime(2026, 3, 25, 12, 0, 0, tzinfo=PL)
    breakdown = [{"label": "Opłata eksploatacyjna", "amount": Decimal("99.22")}]
    result = build_zawiadomienie_pdf(
        "1", breakdown, Decimal("99.22"), "01.2026", SAMPLE_LEGAL, issue_at=fixed,
    )
    assert _is_pdf(result)
    assert len(result) > 1000


def test_pdf_with_custom_legal_basis():
    fixed = datetime(2026, 3, 25, 12, 0, 0, tzinfo=PL)
    custom_legal = "Na podstawie decyzji zarządu z dnia 01.01.2026:"
    result = build_zawiadomienie_pdf(
        "3", SAMPLE_BREAKDOWN, SAMPLE_TOTAL, "01.2026", custom_legal, issue_at=fixed,
    )
    assert _is_pdf(result)
    assert len(result) > 1000


def test_different_amounts_produce_different_pdfs():
    fixed = datetime(2026, 3, 25, 12, 0, 0, tzinfo=PL)
    pdf_a = build_zawiadomienie_pdf(
        "1", SAMPLE_BREAKDOWN, SAMPLE_TOTAL, "12.2025", SAMPLE_LEGAL, issue_at=fixed,
    )
    other_breakdown = [
        {"label": "Opłata eksploatacyjna", "amount": Decimal("150.00")},
    ]
    pdf_b = build_zawiadomienie_pdf(
        "1", other_breakdown, Decimal("150.00"), "12.2025", SAMPLE_LEGAL, issue_at=fixed,
    )
    assert pdf_a != pdf_b


def test_different_apartments_produce_different_pdfs():
    fixed = datetime(2026, 3, 25, 12, 0, 0, tzinfo=PL)
    pdf_a = build_zawiadomienie_pdf(
        "1", SAMPLE_BREAKDOWN, SAMPLE_TOTAL, "12.2025", SAMPLE_LEGAL, issue_at=fixed,
    )
    pdf_b = build_zawiadomienie_pdf(
        "5", SAMPLE_BREAKDOWN, SAMPLE_TOTAL, "12.2025", SAMPLE_LEGAL, issue_at=fixed,
    )
    assert pdf_a != pdf_b
