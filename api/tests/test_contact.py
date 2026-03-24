"""Testy endpointu /api/contact.

Pokryte scenariusze:
- POST /api/contact — wysłanie wiadomości kontaktowej
- Rate limiting — max 3 wiadomości na godzinę z tego samego emaila
"""

from unittest.mock import patch


CONTACT_PAYLOAD = {
    "name": "Jan Kowalski",
    "email": "jan@example.com",
    "subject": "Pytanie o lokal",
    "message": "Dzień dobry, mam pytanie...",
}

SAVED_MESSAGE = {
    "id": "msg-1",
    **CONTACT_PAYLOAD,
    "apartment_number": None,
    "is_read": False,
    "created_at": "2026-03-24T10:00:00",
}


# --- POST /api/contact ----------------------------------------------------


class TestSendContactMessage:
    def test_wyslanie_wiadomosci(self, client, fake_sb):
        fake_sb.set_table_data("contact_messages", [SAVED_MESSAGE])

        with patch("api.routes.contact._try_send_email"):
            response = client.post("/api/contact", json=CONTACT_PAYLOAD)

        assert response.status_code == 200
        assert "wysłana" in response.json()["detail"]

    def test_walidacja_email(self, client, fake_sb):
        payload = {**CONTACT_PAYLOAD, "email": "not-an-email"}
        response = client.post("/api/contact", json=payload)
        assert response.status_code == 422

    def test_walidacja_krotka_wiadomosc(self, client, fake_sb):
        payload = {**CONTACT_PAYLOAD, "message": "Hi"}
        response = client.post("/api/contact", json=payload)
        assert response.status_code == 422


# --- Rate limiting --------------------------------------------------------


class TestContactRateLimit:
    def test_rate_limit_blokuje_po_5_wiadomosciach(self, client, fake_sb):
        """6th message within an hour should be blocked with 429."""
        # Simulate 5 existing messages from same email in the last hour
        existing = [
            {**SAVED_MESSAGE, "id": f"msg-{i}"}
            for i in range(5)
        ]
        fake_sb.set_table_data("contact_messages", existing)

        response = client.post("/api/contact", json=CONTACT_PAYLOAD)
        assert response.status_code == 429
        assert "godzinę" in response.json()["detail"]

    def test_rate_limit_przepuszcza_ponizej_limitu(self, client, fake_sb):
        """4 existing messages — 5th should pass."""
        existing = [
            {**SAVED_MESSAGE, "id": f"msg-{i}"}
            for i in range(4)
        ]
        fake_sb.set_table_data("contact_messages", existing)

        with patch("api.routes.contact._try_send_email"):
            response = client.post("/api/contact", json=CONTACT_PAYLOAD)

        assert response.status_code == 200
