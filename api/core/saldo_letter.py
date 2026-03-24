"""Treść formalnego pisma SALDO (tekst plain).

Musi być zgodna z wydrukiem w panelu admina (site/src/pages/admin/ApartmentsPage.tsx)
oraz stałymi w site/src/data/mockData.ts — przy zmianie tekstów aktualizuj oba miejsca.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

PL = ZoneInfo("Europe/Warsaw")

COMMUNITY_NAME = "Wspólnota Mieszkaniowa GABI"
COMMUNITY_CITY = "89-604 Chojnice"
COMMUNITY_STREET = "Ul. Gdańska 58"
COMMUNITY_PLACE_LINE = "Chojnice"

BANK_ACCOUNT_FORMATTED = "44 1020 1491 0000 4002 0062 4007"

PAYMENT_DUE_INTRO = "Prosimy o uregulowanie należności do dnia:"
PAYMENT_RULE = (
    "Opłatę eksploatacyjną prosimy wpłacać „z góry” do 15 dnia każdego miesiąca, "
    "na rachunek wspólnoty w banku PKO BP nr:"
)
TRANSFER_NOTE = "Przy wpłacie należy podać nr lokalu i okres, za który dokonana jest wpłata."
OVERPAYMENT_SETTLEMENT = (
    "Prosimy o odliczenie nadpłaconej kwoty od opłaty eksploatacyjnej za kolejny miesiąc rozliczeniowy."
)


def format_amount_pl(amount: Decimal) -> str:
    """Format zbliżony do Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2 })."""
    q = amount.quantize(Decimal("0.01"))
    neg = q < 0
    q = abs(q)
    whole, frac = f"{q:.2f}".split(".")
    grouped: list[str] = []
    for i, ch in enumerate(reversed(whole)):
        if i > 0 and i % 3 == 0:
            grouped.append(" ")
        grouped.append(ch)
    num = "".join(reversed(grouped)) + "," + frac
    prefix = "-" if neg else ""
    return f"{prefix}{num} zł"


def _to_pl_datetime(issue_at: datetime | None) -> datetime:
    if issue_at is None:
        return datetime.now(PL)
    if issue_at.tzinfo is None:
        return issue_at.replace(tzinfo=PL)
    return issue_at.astimezone(PL)


def format_date_pl(d: date | datetime) -> str:
    if isinstance(d, datetime):
        d = d.date()
    return d.strftime("%d.%m.%Y")


def build_saldo_letter_plain_text(
    apartment_number: str,
    balance: Decimal,
    *,
    issue_at: datetime | None = None,
) -> str:
    """Treść pisma SALDO — ta sama logika co wydruk (bez HTML / logo)."""
    issue = _to_pl_datetime(issue_at)
    date_label = format_date_pl(issue)
    due_label = format_date_pl(issue.date() + timedelta(days=14))
    amt = format_amount_pl(balance)

    lines = [
        COMMUNITY_NAME,
        COMMUNITY_CITY,
        COMMUNITY_STREET,
        "",
        f"{COMMUNITY_PLACE_LINE}, {date_label}",
        "",
        "SALDO",
        "",
        (
            f"{COMMUNITY_NAME} informuje, iż dla lokalu nr {apartment_number} "
            f"stan konta na dzień {date_label} wynosi: {amt}."
        ),
        "",
    ]
    if balance < 0:
        lines.append(f"{PAYMENT_DUE_INTRO} {due_label}")
        lines.append("")
    elif balance > 0:
        lines.append(OVERPAYMENT_SETTLEMENT)
        lines.append("")

    lines.append(PAYMENT_RULE)
    lines.append(BANK_ACCOUNT_FORMATTED)
    lines.append(TRANSFER_NOTE)

    return "\n".join(lines)
