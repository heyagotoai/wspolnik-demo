"""Okres głosowania wg dat w uchwale (kalendarz PL, strefa Europe/Warsaw)."""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

PL = ZoneInfo("Europe/Warsaw")


def parse_resolution_date(s: str | None) -> date | None:
    if not s or not str(s).strip():
        return None
    raw = str(s).strip()[:10]
    return date.fromisoformat(raw)


def local_today_pl() -> date:
    return datetime.now(PL).date()


def is_within_voting_period(
    voting_start: str | None,
    voting_end: str | None,
    today: date | None = None,
) -> bool:
    """Inkluzywnie [voting_start, voting_end]; brak którejkolwiek daty = poza okresem (uchwały mają mieć obie daty)."""
    t = today if today is not None else local_today_pl()
    start_d = parse_resolution_date(voting_start)
    end_d = parse_resolution_date(voting_end)
    if start_d is None or end_d is None:
        return False
    if t < start_d:
        return False
    if t > end_d:
        return False
    return True


def has_voting_ended(voting_end: str | None, today: date | None = None) -> bool:
    """Po ostatnim dniu głosowania (kalendarz PL) — następny dzień i później."""
    t = today if today is not None else local_today_pl()
    end_d = parse_resolution_date(voting_end)
    if end_d is None:
        return False
    return t > end_d
