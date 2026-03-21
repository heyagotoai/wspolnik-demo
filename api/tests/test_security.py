"""Testy modułu security — weryfikacja JWT i kontrola roli admin.

Pokryte scenariusze:
- Brak nagłówka Authorization → 401
- Nieprawidłowy format tokenu → 401
- Token odrzucony przez Supabase → 401
- Poprawny token → użytkownik rozpoznany
- require_admin: mieszkaniec (nie admin) → 403
- require_admin: admin → dostęp przyznany
"""

from types import SimpleNamespace


class TestGetCurrentUser:
    """Testy weryfikacji tokenu JWT (get_current_user)."""

    def test_brak_naglowka_auth_zwraca_401(self, client):
        """Żądanie bez tokenu powinno zwrócić 401."""
        response = client.get("/api/residents")
        assert response.status_code == 401
        assert "Brak tokenu" in response.json()["detail"]

    def test_nieprawidlowy_format_tokenu_zwraca_401(self, client):
        """Token bez prefiksu 'Bearer ' powinien być odrzucony."""
        response = client.get("/api/residents", headers={"Authorization": "Token abc"})
        assert response.status_code == 401

    def test_token_odrzucony_przez_supabase_zwraca_401(self, client, fake_sb):
        """Gdy Supabase odrzuci token, endpoint zwraca 401."""
        fake_sb.auth.get_user.side_effect = Exception("invalid jwt")
        response = client.get(
            "/api/residents",
            headers={"Authorization": "Bearer bad-token"},
        )
        assert response.status_code == 401
        assert "Nieprawidłowy token" in response.json()["detail"]

    def test_supabase_zwraca_brak_usera_401(self, client, fake_sb):
        """Gdy Supabase zwraca pusty user, endpoint zwraca 401."""
        fake_sb.auth.get_user.return_value = SimpleNamespace(user=None)
        response = client.get(
            "/api/residents",
            headers={"Authorization": "Bearer orphan-token"},
        )
        assert response.status_code == 401


class TestRequireAdmin:
    """Testy sprawdzania roli admin (require_admin)."""

    def test_mieszkaniec_nie_ma_dostepu_do_admin_endpointu(self, client, resident_headers):
        """Użytkownik z rolą 'resident' dostaje 403."""
        response = client.get("/api/residents", headers=resident_headers)
        assert response.status_code == 403
        assert "Brak uprawnień" in response.json()["detail"]

    def test_admin_ma_dostep(self, client, admin_headers, fake_sb):
        """Użytkownik z rolą 'admin' przechodzi przez require_admin.

        Uwaga: po przejściu auth, endpoint list_residents RÓWNIEŻ odpytuje
        table("residents") — ale mock zwraca te same dane.
        Ważne jest, że nie dostał 401/403.
        """
        # admin_headers ustawia residents=[{"role": "admin"}] dla require_admin.
        # Ale list_residents też odpytuje residents i potrzebuje pełnych danych.
        # Nadpisujemy danymi z pełnym schematem:
        fake_sb.set_table_data("residents", [
            {"id": "admin-1", "email": "admin@gabi.pl", "full_name": "Admin",
             "apartment_number": "1", "role": "admin", "is_active": True,
             "created_at": "2025-01-01T00:00:00"},
        ])
        response = client.get("/api/residents", headers=admin_headers)
        assert response.status_code == 200
