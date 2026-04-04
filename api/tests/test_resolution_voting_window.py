from datetime import date

from api.core.resolution_voting_window import (
    has_voting_ended,
    is_within_voting_period,
    parse_resolution_date,
)


def test_parse_resolution_date():
    assert parse_resolution_date("2026-04-01") == date(2026, 4, 1)
    assert parse_resolution_date("2026-04-01T00:00:00Z") == date(2026, 4, 1)
    assert parse_resolution_date(None) is None
    assert parse_resolution_date("") is None


def test_okres_inkluzywny():
    assert is_within_voting_period("2026-04-01", "2026-04-15", date(2026, 4, 1))
    assert is_within_voting_period("2026-04-01", "2026-04-15", date(2026, 4, 15))
    assert not is_within_voting_period("2026-04-01", "2026-04-15", date(2026, 3, 31))
    assert not is_within_voting_period("2026-04-01", "2026-04-15", date(2026, 4, 16))


def test_bez_pelnych_dat_poza_okresem():
    assert not is_within_voting_period(None, "2026-04-15", date(2026, 4, 10))
    assert not is_within_voting_period("2026-04-01", None, date(2026, 4, 10))


def test_has_voting_ended():
    assert has_voting_ended("2026-03-31", date(2026, 4, 1))
    assert not has_voting_ended("2026-03-31", date(2026, 3, 31))
    assert not has_voting_ended("2026-03-31", date(2026, 3, 30))
    assert not has_voting_ended(None, date(2026, 4, 1))
