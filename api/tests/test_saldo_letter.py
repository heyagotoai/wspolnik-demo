"""Treść pisma SALDO (zgodność maila z wydrukiem)."""

from datetime import datetime
from decimal import Decimal

from api.core.saldo_letter import (
    PL,
    build_saldo_letter_plain_text,
    format_amount_pl,
    format_date_pl,
)


def test_format_amount_pl_grouping_and_sign():
    assert format_amount_pl(Decimal("0")) == "0,00 zł"
    assert format_amount_pl(Decimal("1234.5")) == "1 234,50 zł"
    assert format_amount_pl(Decimal("-99.99")) == "-99,99 zł"


def test_build_saldo_letter_negative_includes_due_date():
    fixed = datetime(2026, 3, 24, 12, 0, 0, tzinfo=PL)
    text = build_saldo_letter_plain_text("47", Decimal("-100.00"), issue_at=fixed)
    assert "SALDO" in text
    assert "lokalu nr 47" in text
    assert "stan konta na dzień 24.03.2026" in text
    assert "-100,00 zł" in text
    assert "Prosimy o uregulowanie należności do dnia: 07.04.2026" in text
    assert "44 1020 1491 0000 4002 0062 4007" in text


def test_build_saldo_letter_positive_includes_overpayment_text():
    fixed = datetime(2026, 1, 15, 10, 0, 0, tzinfo=PL)
    text = build_saldo_letter_plain_text("12", Decimal("50.25"), issue_at=fixed)
    assert "50,25 zł" in text
    assert "odliczenie nadpłaconej kwoty" in text
    assert "Prosimy o uregulowanie należności" not in text


def test_build_saldo_letter_zero_no_due_no_overpayment_block():
    fixed = datetime(2026, 6, 1, 8, 0, 0, tzinfo=PL)
    text = build_saldo_letter_plain_text("3", Decimal("0"), issue_at=fixed)
    assert "0,00 zł" in text
    assert "Prosimy o uregulowanie należności do dnia:" not in text
    assert "odliczenie nadpłaconej kwoty" not in text
    assert "Opłatę eksploatacyjną prosimy wpłacać" in text


def test_format_date_pl():
    assert format_date_pl(datetime(2026, 12, 5, tzinfo=PL)) == "05.12.2026"
