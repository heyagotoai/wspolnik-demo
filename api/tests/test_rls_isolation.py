"""Testy izolacji danych i bezpieczeństwa (RLS simulation).

Weryfikują, że:
1. Mieszkaniec NIE może wykonać operacji admina
2. Mieszkaniec nie może odczytać danych innego mieszkańca
3. Niezalogowany user nie ma dostępu do chronionych endpointów
4. Admin endpoints odrzucają tokeny mieszkańców (pełny auth flow)
"""

from types import SimpleNamespace
from unittest.mock import MagicMock

from api.tests.conftest import FakeSupabaseBuilder


# --- Fixtures: drugi mieszkaniec -----------------------------------------------

RESIDENT_1 = {
    "id": "res-1",
    "email": "jan@gabi.pl",
    "full_name": "Jan Kowalski",
    "apartment_number": "12A",
    "role": "resident",
    "is_active": True,
    "created_at": "2026-01-15T10:00:00Z",
}

RESIDENT_2 = {
    "id": "res-2",
    "email": "anna@gabi.pl",
    "full_name": "Anna Nowak",
    "apartment_number": "15B",
    "role": "resident",
    "is_active": True,
    "created_at": "2026-02-01T10:00:00Z",
}


# =============================================================================
# 1. Mieszkaniec NIE może wykonać operacji admina
# =============================================================================


class TestResidentCannotDoAdminOps:
    """Resident token jest odrzucany na admin-only endpointach."""

    # --- Residents CRUD (admin only) ---

    def test_resident_nie_moze_listowac_mieszkancow(self, client, resident_headers):
        """GET /api/residents wymaga admina."""
        r = client.get("/api/residents", headers=resident_headers)
        assert r.status_code == 403

    def test_resident_nie_moze_tworzyc_mieszkanca(self, client, resident_headers):
        """POST /api/residents wymaga admina."""
        r = client.post("/api/residents", headers=resident_headers, json={
            "email": "new@gabi.pl",
            "password": "test123",
            "full_name": "Nowy Mieszkaniec",
            "apartment_number": "20",
            "role": "resident",
        })
        assert r.status_code == 403

    def test_resident_nie_moze_aktualizowac_mieszkanca(self, client, resident_headers):
        """PATCH /api/residents/:id wymaga admina."""
        r = client.patch("/api/residents/res-2", headers=resident_headers, json={
            "full_name": "Hacked Name",
        })
        assert r.status_code == 403

    def test_resident_nie_moze_usunac_mieszkanca(self, client, resident_headers):
        """DELETE /api/residents/:id wymaga admina."""
        r = client.delete("/api/residents/res-2", headers=resident_headers)
        assert r.status_code == 403

    # --- Charge generation (admin only) ---

    def test_resident_nie_moze_generowac_naliczen(self, client, resident_headers):
        """POST /api/charges/generate wymaga admina."""
        r = client.post("/api/charges/generate", headers=resident_headers, json={
            "month": "2026-03-01",
        })
        assert r.status_code == 403

    def test_resident_nie_moze_tworzyc_stawki(self, client, resident_headers):
        """POST /api/charges/rates wymaga admina."""
        r = client.post("/api/charges/rates", headers=resident_headers, json={
            "type": "eksploatacja",
            "rate_per_unit": "5.00",
            "valid_from": "2026-04-01",
        })
        assert r.status_code == 403

    def test_resident_nie_moze_usunac_stawki(self, client, resident_headers):
        """DELETE /api/charges/rates/:id wymaga admina."""
        r = client.delete("/api/charges/rates/rate-1", headers=resident_headers)
        assert r.status_code == 403

    def test_resident_nie_moze_aktualizowac_auto_config(self, client, resident_headers):
        """PATCH /api/charges/auto-config wymaga admina."""
        r = client.patch("/api/charges/auto-config", headers=resident_headers, json={
            "enabled": True,
        })
        assert r.status_code == 403

    # --- Resolutions CRUD (admin only) ---

    def test_resident_nie_moze_tworzyc_uchwaly(self, client, resident_headers):
        """POST /api/resolutions wymaga admina."""
        r = client.post("/api/resolutions", headers=resident_headers, json={
            "title": "Próba włamania",
            "status": "draft",
        })
        assert r.status_code == 403

    def test_resident_nie_moze_aktualizowac_uchwaly(self, client, resident_headers):
        """PATCH /api/resolutions/:id wymaga admina."""
        r = client.patch("/api/resolutions/res-1", headers=resident_headers, json={
            "status": "voting",
        })
        assert r.status_code == 403

    def test_resident_nie_moze_usunac_uchwaly(self, client, resident_headers):
        """DELETE /api/resolutions/:id wymaga admina."""
        r = client.delete("/api/resolutions/res-1", headers=resident_headers)
        assert r.status_code == 403

    def test_resident_nie_moze_pobrac_listy_glosow(self, client, resident_headers):
        """GET /api/resolutions/:id/votes (szczegóły głosów) wymaga admina."""
        r = client.get("/api/resolutions/res-1/votes", headers=resident_headers)
        assert r.status_code == 403

    def test_resident_nie_moze_resetowac_glosow(self, client, resident_headers):
        """DELETE /api/resolutions/:id/votes (reset głosów) wymaga admina."""
        r = client.delete("/api/resolutions/res-1/votes", headers=resident_headers)
        assert r.status_code == 403

    # --- Balance notification (admin only) ---

    def test_resident_nie_moze_wyslac_powiadomienia_o_saldzie(self, client, resident_headers):
        """POST /api/charges/balance-notification/:id wymaga admina."""
        r = client.post(
            "/api/charges/balance-notification/apt-1",
            headers=resident_headers,
        )
        assert r.status_code == 403


# =============================================================================
# 2. Mieszkaniec nie może odczytać danych innego mieszkańca
# =============================================================================


class TestResidentDataIsolation:
    """Profil i dane finansowe są ograniczone do zalogowanego użytkownika.

    Endpointy profilu filtrują po user['sub'] — nie przyjmują arbitralnego ID.
    Testujemy, że endpoint zwraca dane tylko dla uwierzytelnionego usera,
    nie pozwalając na podmianę user ID.
    """

    def test_profil_zwraca_dane_wlasnego_usera(self, fake_sb, resident_client):
        """GET /api/profile zwraca dane resident_client (res-1), nie innego."""
        # resident_client jest override'owany na sub="res-1"
        fake_sb.set_table_data("residents", [RESIDENT_1])

        r = resident_client.get("/api/profile")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "res-1"
        assert data["email"] == "jan@gabi.pl"

    def test_profil_nie_zwraca_danych_innego_mieszkanca(self, fake_sb, app):
        """Drugi mieszkaniec nie widzi profilu pierwszego.

        Symulujemy drugiego mieszkańca override'ując get_current_user na res-2.
        FakeSupabase zwraca pusty wynik (RLS filtruje po user ID).
        """
        from fastapi.testclient import TestClient
        from api.core.security import get_current_user

        app.dependency_overrides[get_current_user] = lambda: {
            "sub": "res-2", "email": "anna@gabi.pl",
        }
        client2 = TestClient(app)

        # Symulacja RLS: zapytanie .eq("id", "res-2") nie znajdzie danych res-1
        fake_sb.set_table_data("residents", [])

        r = client2.get("/api/profile")
        assert r.status_code == 404  # Profil nie znaleziony — brak danych innego usera

    def test_zmiana_profilu_innego_usera_niemozliwa(self, fake_sb, app):
        """PATCH /api/profile działa tylko na zalogowanego usera.

        Endpoint filtruje po user['sub'] — nie da się zmienić profilu innego usera.
        """
        from fastapi.testclient import TestClient
        from api.core.security import get_current_user

        app.dependency_overrides[get_current_user] = lambda: {
            "sub": "res-2", "email": "anna@gabi.pl",
        }
        client2 = TestClient(app)

        # Brak danych — update .eq("id", "res-2") nic nie znajdzie
        fake_sb.set_table_data("residents", [])

        r = client2.patch("/api/profile", json={"full_name": "Hacker"})
        assert r.status_code == 404

    def test_my_vote_filtruje_po_zalogowanym_userze(self, fake_sb, app):
        """GET /api/resolutions/:id/my-vote zwraca null jeśli user nie głosował.

        Nawet jeśli inny user głosował — endpoint filtruje po resident_id = user['sub'].
        """
        from fastapi.testclient import TestClient
        from api.core.security import get_current_user

        app.dependency_overrides[get_current_user] = lambda: {
            "sub": "res-2", "email": "anna@gabi.pl",
        }
        client2 = TestClient(app)

        # Głos istnieje ale należy do res-1, nie res-2
        # FakeSupabase nie filtruje naprawdę, ale w produkcji RLS to robi.
        # Symulujemy puste dane (jak po filtrowaniu po res-2)
        fake_sb.set_table_data("votes", [])

        r = client2.get("/api/resolutions/res-1/my-vote")
        assert r.status_code == 200
        assert r.json() is None


# =============================================================================
# 3. Niezalogowany user nie ma dostępu do panelu mieszkańca ani admina
# =============================================================================


class TestUnauthenticatedAccess:
    """Wszystkie chronione endpointy wymagają tokenu — brak tokenu = 401."""

    # --- Resident panel endpoints ---

    def test_profil_wymaga_auth(self, client):
        r = client.get("/api/profile")
        assert r.status_code == 401

    def test_zmiana_profilu_wymaga_auth(self, client):
        r = client.patch("/api/profile", json={"full_name": "Hacker"})
        assert r.status_code == 401

    def test_zmiana_hasla_wymaga_auth(self, client):
        r = client.post("/api/profile/change-password", json={
            "current_password": "old", "new_password": "new123",
        })
        assert r.status_code == 401

    def test_lista_uchwal_wymaga_auth(self, client):
        r = client.get("/api/resolutions")
        assert r.status_code == 401

    def test_wyniki_glosowania_wymaga_auth(self, client):
        r = client.get("/api/resolutions/res-1/results")
        assert r.status_code == 401

    def test_moj_glos_wymaga_auth(self, client):
        r = client.get("/api/resolutions/res-1/my-vote")
        assert r.status_code == 401

    def test_oddanie_glosu_wymaga_auth(self, client):
        r = client.post("/api/resolutions/res-1/vote", json={"vote": "za"})
        assert r.status_code == 401

    def test_lista_stawek_wymaga_auth(self, client):
        r = client.get("/api/charges/rates")
        assert r.status_code == 401

    def test_auto_config_wymaga_auth(self, client):
        r = client.get("/api/charges/auto-config")
        assert r.status_code == 401

    # --- Admin panel endpoints ---

    def test_lista_mieszkancow_wymaga_auth(self, client):
        r = client.get("/api/residents")
        assert r.status_code == 401

    def test_tworzenie_mieszkanca_wymaga_auth(self, client):
        r = client.post("/api/residents", json={
            "email": "x@x.pl", "password": "test123",
            "full_name": "X", "role": "resident",
        })
        assert r.status_code == 401

    def test_generowanie_naliczen_wymaga_auth(self, client):
        r = client.post("/api/charges/generate", json={"month": "2026-03-01"})
        assert r.status_code == 401

    def test_tworzenie_stawki_wymaga_auth(self, client):
        r = client.post("/api/charges/rates", json={
            "type": "eksploatacja", "rate_per_unit": "5.00", "valid_from": "2026-04-01",
        })
        assert r.status_code == 401

    def test_usuwanie_stawki_wymaga_auth(self, client):
        r = client.delete("/api/charges/rates/rate-1")
        assert r.status_code == 401

    def test_tworzenie_uchwaly_wymaga_auth(self, client):
        r = client.post("/api/resolutions", json={"title": "Test"})
        assert r.status_code == 401

    def test_aktualizacja_uchwaly_wymaga_auth(self, client):
        r = client.patch("/api/resolutions/res-1", json={"status": "voting"})
        assert r.status_code == 401

    def test_usuwanie_uchwaly_wymaga_auth(self, client):
        r = client.delete("/api/resolutions/res-1")
        assert r.status_code == 401

    def test_reset_glosow_wymaga_auth(self, client):
        r = client.delete("/api/resolutions/res-1/votes")
        assert r.status_code == 401

    def test_powiadomienie_o_saldzie_wymaga_auth(self, client):
        r = client.post("/api/charges/balance-notification/apt-1")
        assert r.status_code == 401

    def test_masowe_powiadomienie_o_saldzie_wymaga_auth(self, client):
        r = client.post("/api/charges/balance-notification-bulk", json={"apartment_ids": ["apt-1"]})
        assert r.status_code == 401

    def test_aktualizacja_auto_config_wymaga_auth(self, client):
        r = client.patch("/api/charges/auto-config", json={"enabled": True})
        assert r.status_code == 401


# =============================================================================
# 4. Admin endpoints odrzucają tokeny mieszkańców (pełny auth flow)
# =============================================================================


class TestAdminEndpointsRejectResidentTokens:
    """Pełny auth flow: token jest poprawny (Supabase go akceptuje),
    ale rola w tabeli residents to 'resident', nie 'admin'.

    Używa client + resident_headers (nie resident_client, który omija auth).
    """

    def test_lista_mieszkancow_odrzuca_resident(self, client, resident_headers):
        r = client.get("/api/residents", headers=resident_headers)
        assert r.status_code == 403
        assert "Brak uprawnień" in r.json()["detail"]

    def test_tworzenie_mieszkanca_odrzuca_resident(self, client, resident_headers):
        r = client.post("/api/residents", headers=resident_headers, json={
            "email": "hack@gabi.pl",
            "password": "hack123",
            "full_name": "Hacker",
            "role": "admin",  # próba eskalacji uprawnień
        })
        assert r.status_code == 403

    def test_generowanie_naliczen_odrzuca_resident(self, client, resident_headers):
        r = client.post("/api/charges/generate", headers=resident_headers, json={
            "month": "2026-03-01",
        })
        assert r.status_code == 403

    def test_tworzenie_stawki_odrzuca_resident(self, client, resident_headers):
        r = client.post("/api/charges/rates", headers=resident_headers, json={
            "type": "eksploatacja",
            "rate_per_unit": "999.00",
            "valid_from": "2026-01-01",
        })
        assert r.status_code == 403

    def test_usuwanie_stawki_odrzuca_resident(self, client, resident_headers):
        r = client.delete("/api/charges/rates/rate-1", headers=resident_headers)
        assert r.status_code == 403

    def test_tworzenie_uchwaly_odrzuca_resident(self, client, resident_headers):
        r = client.post("/api/resolutions", headers=resident_headers, json={
            "title": "Próba eskalacji",
            "status": "draft",
        })
        assert r.status_code == 403

    def test_aktualizacja_uchwaly_odrzuca_resident(self, client, resident_headers):
        r = client.patch("/api/resolutions/res-1", headers=resident_headers, json={
            "status": "voting",
        })
        assert r.status_code == 403

    def test_usuwanie_uchwaly_odrzuca_resident(self, client, resident_headers):
        r = client.delete("/api/resolutions/res-1", headers=resident_headers)
        assert r.status_code == 403

    def test_lista_glosow_odrzuca_resident(self, client, resident_headers):
        r = client.get("/api/resolutions/res-1/votes", headers=resident_headers)
        assert r.status_code == 403

    def test_reset_glosow_odrzuca_resident(self, client, resident_headers):
        r = client.delete("/api/resolutions/res-1/votes", headers=resident_headers)
        assert r.status_code == 403

    def test_aktualizacja_auto_config_odrzuca_resident(self, client, resident_headers):
        r = client.patch("/api/charges/auto-config", headers=resident_headers, json={
            "enabled": True,
        })
        assert r.status_code == 403

    def test_powiadomienie_o_saldzie_odrzuca_resident(self, client, resident_headers):
        r = client.post(
            "/api/charges/balance-notification/apt-1",
            headers=resident_headers,
        )
        assert r.status_code == 403

    def test_masowe_powiadomienie_o_saldzie_odrzuca_resident(self, client, resident_headers):
        r = client.post(
            "/api/charges/balance-notification-bulk",
            headers=resident_headers,
            json={"apartment_ids": ["apt-1"]},
        )
        assert r.status_code == 403

    def test_eskalacja_roli_przez_tworzenie_admina_odrzucona(self, client, resident_headers):
        """Mieszkaniec nie może stworzyć nowego admina (próba privilege escalation)."""
        r = client.post("/api/residents", headers=resident_headers, json={
            "email": "new-admin@gabi.pl",
            "password": "admin123",
            "full_name": "Fałszywy Admin",
            "role": "admin",
            "apartment_number": "99",
        })
        assert r.status_code == 403
