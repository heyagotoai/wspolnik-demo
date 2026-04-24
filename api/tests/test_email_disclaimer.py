"""Teksty stopek e-mail."""

from api.core.email_disclaimer import (
    PUBLIC_CONTACT_URL,
    automated_email_footer,
    contact_form_relay_footer,
)


def test_automated_footer_zawiera_kontakt_i_ostrzezenie():
    t = automated_email_footer()
    assert "automatycznie" in t.lower()
    assert "nie odpowiadać" in t.lower()
    assert "wypełnij" in t.lower()
    assert PUBLIC_CONTACT_URL in t


def test_contact_relay_footer_zawiera_odpowiedz():
    t = contact_form_relay_footer()
    assert "automatycznie" in t.lower()
    assert "odpowiedz" in t.lower()
