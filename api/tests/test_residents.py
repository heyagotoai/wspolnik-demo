"""Testy CRUD endpointów /api/residents.

Używa admin_client z dependency_overrides — auth jest pominięty,
testujemy czystą logikę endpointów.

Pokryte scenariusze:
- GET  /api/residents      — lista mieszkańców
- POST /api/residents      — tworzenie mieszkańca z kontem auth
- PATCH /api/residents/:id — aktualizacja danych
- DELETE /api/residents/:id — usuwanie mieszkańca
- GET /api/health          — health check (publiczny)
"""

from types import SimpleNamespace
from unittest.mock import MagicMock


# --- Health check (publiczny) ------------------------------------------------

class TestHealthEndpoint:
    def test_health_zwraca_ok(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


# --- GET /api/residents ------------------------------------------------------

class TestListResidents:
    def test_lista_mieszkancow(self, admin_client, fake_sb):
        residents_data = [
            {"id": "r1", "email": "jan@gabi.pl", "full_name": "Jan Kowalski",
             "apartment_number": "1A", "role": "resident", "is_active": True,
             "created_at": "2025-01-01T00:00:00"},
            {"id": "r2", "email": "anna@gabi.pl", "full_name": "Anna Nowak",
             "apartment_number": "2B", "role": "resident", "is_active": True,
             "created_at": "2025-01-02T00:00:00"},
        ]
        fake_sb.set_table_data("residents", residents_data)

        response = admin_client.get("/api/residents")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["full_name"] == "Jan Kowalski"

    def test_lista_niedostepna_bez_logowania(self, client):
        response = client.get("/api/residents")
        assert response.status_code == 401


# --- POST /api/residents -----------------------------------------------------

class TestCreateResident:
    def test_tworzenie_mieszkanca(self, admin_client, fake_sb):
        # Mock auth.admin.create_user
        fake_user = SimpleNamespace(id="new-id", email="nowy@gabi.pl")
        fake_sb.auth.admin = MagicMock()
        fake_sb.auth.admin.create_user.return_value = SimpleNamespace(user=fake_user)

        # Mock table insert — FakeSupabaseBuilder will use insert data
        inserted = {
            "id": "new-id", "email": "nowy@gabi.pl", "full_name": "Nowy Mieszkaniec",
            "apartment_number": "3C", "role": "resident", "is_active": True,
            "created_at": "2025-03-01T00:00:00",
        }
        fake_sb.set_table_data("residents", [inserted])

        response = admin_client.post("/api/residents", json={
            "email": "nowy@gabi.pl",
            "password": "Silne!Haslo123",
            "full_name": "Nowy Mieszkaniec",
            "apartment_number": "3C",
        })
        assert response.status_code == 201
        assert response.json()["email"] == "nowy@gabi.pl"

    def test_tworzenie_bez_wymaganych_pol_zwraca_422(self, admin_client):
        response = admin_client.post("/api/residents", json={})
        assert response.status_code == 422

    def test_tworzenie_z_nieprawidlowym_emailem_zwraca_422(self, admin_client):
        response = admin_client.post("/api/residents", json={
            "email": "nie-email",
            "password": "haslo123",
            "full_name": "Test",
        })
        assert response.status_code == 422

    def test_tworzenie_bez_konta_placeholder_auth_user(self, admin_client, fake_sb):
        """Brak email/password → mieszkaniec „bez konta" (rejestr, np. do głosów z zebrania).

        Backend tworzy placeholder-auth-usera z banem na długi okres.
        residents.email = NULL, residents.has_account = False.
        """
        fake_user = SimpleNamespace(id="noacc-id", email="no-login-xyz@no-login.wmgabi.local")
        fake_sb.auth.admin = MagicMock()
        fake_sb.auth.admin.create_user.return_value = SimpleNamespace(user=fake_user)

        inserted = {
            "id": "noacc-id", "email": None, "full_name": "Adam Bez-Konta",
            "apartment_number": "5A", "role": "resident", "is_active": True,
            "has_account": False, "created_at": "2026-04-24T00:00:00",
        }
        fake_sb.set_table_data("residents", [inserted])

        response = admin_client.post("/api/residents", json={
            "full_name": "Adam Bez-Konta",
            "apartment_number": "5A",
        })
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["email"] is None
        assert data["has_account"] is False

        # Weryfikacja wywołania create_user: placeholder-email + ban_duration
        create_kwargs = fake_sb.auth.admin.create_user.call_args[0][0]
        assert create_kwargs["email"].endswith("@no-login.wmgabi.local")
        assert "ban_duration" in create_kwargs

    def test_tworzenie_z_emailem_bez_hasla_zwraca_422(self, admin_client):
        """Podanie emaila bez hasła = błąd walidacji (muszą iść w parze)."""
        response = admin_client.post("/api/residents", json={
            "email": "jan@gabi.pl",
            "full_name": "Jan",
        })
        assert response.status_code == 422

    def test_tworzenie_z_haslem_bez_emaila_zwraca_422(self, admin_client):
        """Hasło bez emaila = błąd walidacji."""
        response = admin_client.post("/api/residents", json={
            "password": "Silne!Haslo123",
            "full_name": "Jan",
        })
        assert response.status_code == 422


# --- PATCH /api/residents/:id ------------------------------------------------

class TestUpdateResident:
    def test_aktualizacja_mieszkanca(self, admin_client, fake_sb):
        updated = {
            "id": "r1", "email": "jan@gabi.pl", "full_name": "Jan Kowalski-Nowy",
            "apartment_number": "1A", "role": "resident", "is_active": True,
            "created_at": "2025-01-01T00:00:00",
        }
        fake_sb.set_table_data("residents", [updated])

        response = admin_client.patch("/api/residents/r1", json={
            "full_name": "Jan Kowalski-Nowy",
        })
        assert response.status_code == 200
        assert response.json()["full_name"] == "Jan Kowalski-Nowy"

    def test_aktualizacja_bez_danych_zwraca_400(self, admin_client):
        response = admin_client.patch("/api/residents/r1", json={})
        assert response.status_code == 400
        assert "Brak danych" in response.json()["detail"]

    def test_aktualizacja_nieistniejacego_zwraca_404(self, admin_client, fake_sb):
        fake_sb.set_table_data("residents", [])

        response = admin_client.patch("/api/residents/not-exist", json={
            "full_name": "Test",
        })
        assert response.status_code == 404

    def test_nadanie_konta_mieszkancowi_bez_konta(self, admin_client, fake_sb):
        """Email + password dla mieszkańca bez konta → aktywacja:
        aktualizujemy auth.users + has_account=true.
        """
        existing = {
            "id": "r1", "email": None, "full_name": "Adam",
            "apartment_number": "5A", "role": "resident", "is_active": True,
            "has_account": False, "created_at": "2026-04-24T00:00:00",
        }
        fake_sb.set_table_data("residents", [existing])
        fake_sb.auth.admin = MagicMock()

        response = admin_client.patch("/api/residents/r1", json={
            "email": "adam@gabi.pl",
            "password": "Silne!Haslo123",
        })
        assert response.status_code == 200, response.text
        # Supabase admin update_user_by_id powinno być wywołane (aktywacja = email, password, unban)
        assert fake_sb.auth.admin.update_user_by_id.called
        args, _ = fake_sb.auth.admin.update_user_by_id.call_args
        assert args[0] == "r1"
        payload = args[1]
        assert payload["email"] == "adam@gabi.pl"
        assert payload["password"] == "Silne!Haslo123"
        assert payload["ban_duration"] == "none"

    def test_ponowne_nadanie_konta_zwraca_400(self, admin_client, fake_sb):
        """Mieszkaniec ma już konto → zmiana emaila/hasła przez ten endpoint zabroniona."""
        existing = {
            "id": "r1", "email": "stary@gabi.pl", "full_name": "Adam",
            "apartment_number": "5A", "role": "resident", "is_active": True,
            "has_account": True, "created_at": "2026-04-24T00:00:00",
        }
        fake_sb.set_table_data("residents", [existing])

        response = admin_client.patch("/api/residents/r1", json={
            "email": "nowy@gabi.pl",
            "password": "Silne!Haslo123",
        })
        assert response.status_code == 400
        assert "już konto" in response.json()["detail"]

    def test_aktualizacja_ignoruje_email_bez_hasla(self, admin_client, fake_sb):
        """Email bez hasła = błąd walidacji (muszą iść w parze)."""
        existing = {
            "id": "r1", "email": None, "full_name": "Adam",
            "apartment_number": "5A", "role": "resident", "is_active": True,
            "has_account": False, "created_at": "2026-04-24T00:00:00",
        }
        fake_sb.set_table_data("residents", [existing])

        response = admin_client.patch("/api/residents/r1", json={
            "email": "adam@gabi.pl",
        })
        assert response.status_code == 422


# --- DELETE /api/residents/:id -----------------------------------------------

class TestDeleteResident:
    def test_usuwanie_mieszkanca(self, admin_client, fake_sb):
        fake_sb.set_table_data("residents", [{"id": "r1", "email": "jan@gabi.pl"}])
        fake_sb.auth.admin = MagicMock()

        response = admin_client.delete("/api/residents/r1")
        assert response.status_code == 200
        assert "usunięty" in response.json()["detail"]

    def test_usuwanie_nieistniejacego_zwraca_404(self, admin_client, fake_sb):
        fake_sb.set_table_data("residents", [])

        response = admin_client.delete("/api/residents/not-exist")
        assert response.status_code == 404
