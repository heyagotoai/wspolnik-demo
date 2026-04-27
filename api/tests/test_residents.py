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
from unittest.mock import MagicMock, patch


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


# --- PATCH /api/residents/:id/email ------------------------------------------

class TestChangeResidentEmail:
    def test_zmiana_emaila_sukces(self, admin_client, fake_sb):
        existing = {
            "id": "r1", "email": "stary@gabi.pl", "full_name": "Adam",
            "apartment_number": "5A", "role": "resident", "is_active": True,
            "has_account": True, "created_at": "2026-04-24T00:00:00",
        }
        fake_sb.set_table_data("residents", [existing])
        fake_sb.auth.admin = MagicMock()

        with patch("api.routes.residents.httpx.post") as httpx_post:
            httpx_post.return_value = SimpleNamespace(status_code=204, text="")
            response = admin_client.patch(
                "/api/residents/r1/email", json={"email": "nowy@gabi.pl"},
            )
        assert response.status_code == 200, response.text
        assert response.json()["email"] == "nowy@gabi.pl"

        # auth.admin.update_user_by_id wywołane z email + email_confirm
        assert fake_sb.auth.admin.update_user_by_id.called
        args, _ = fake_sb.auth.admin.update_user_by_id.call_args
        assert args[0] == "r1"
        assert args[1]["email"] == "nowy@gabi.pl"
        assert args[1]["email_confirm"] is True
        # Hasło NIE może być zmieniane przy samej zmianie emaila
        assert "password" not in args[1]

        # Wszystkie sesje mieszkańca muszą zostać unieważnione (REST logout)
        assert httpx_post.called
        url = httpx_post.call_args[0][0]
        assert url.endswith("/auth/v1/admin/users/r1/logout")
        assert httpx_post.call_args[1]["params"]["scope"] == "global"

    def test_zmiana_emaila_dla_mieszkanca_bez_konta_zwraca_400(self, admin_client, fake_sb):
        existing = {
            "id": "r1", "email": None, "full_name": "Adam",
            "apartment_number": "5A", "role": "resident", "is_active": True,
            "has_account": False, "created_at": "2026-04-24T00:00:00",
        }
        fake_sb.set_table_data("residents", [existing])

        response = admin_client.patch(
            "/api/residents/r1/email", json={"email": "nowy@gabi.pl"},
        )
        assert response.status_code == 400
        assert "nie ma konta" in response.json()["detail"]

    def test_zmiana_emaila_na_taki_sam_jest_idempotentna(self, admin_client, fake_sb):
        """Ten sam email = no-op (200 OK), bez auth update, bez audit, bez sign-out.

        Dzięki temu race condition (np. dwa szybkie kliknięcia) nie wybucha 400.
        """
        existing = {
            "id": "r1", "email": "ten-sam@gabi.pl", "full_name": "Adam",
            "apartment_number": "5A", "role": "resident", "is_active": True,
            "has_account": True, "created_at": "2026-04-24T00:00:00",
        }
        fake_sb.set_table_data("residents", [existing])
        fake_sb.auth.admin = MagicMock()

        with patch("api.routes.residents.httpx.post") as httpx_post:
            response = admin_client.patch(
                "/api/residents/r1/email", json={"email": "ten-sam@gabi.pl"},
            )

        assert response.status_code == 200
        assert response.json()["email"] == "ten-sam@gabi.pl"
        # No-op — żadnych side effectów
        assert not fake_sb.auth.admin.update_user_by_id.called
        assert not httpx_post.called

    def test_zmiana_emaila_case_insensitive_no_op(self, admin_client, fake_sb):
        """Różnica wielkości liter nie wymusza zmiany — Supabase Auth normalizuje do lowercase."""
        existing = {
            "id": "r1", "email": "adam@gabi.pl", "full_name": "Adam",
            "apartment_number": "5A", "role": "resident", "is_active": True,
            "has_account": True, "created_at": "2026-04-24T00:00:00",
        }
        fake_sb.set_table_data("residents", [existing])
        fake_sb.auth.admin = MagicMock()

        with patch("api.routes.residents.httpx.post") as httpx_post:
            response = admin_client.patch(
                "/api/residents/r1/email", json={"email": "Adam@Gabi.PL"},
            )

        assert response.status_code == 200
        assert not fake_sb.auth.admin.update_user_by_id.called
        assert not httpx_post.called

    def test_zmiana_emaila_nieistniejacego_zwraca_404(self, admin_client, fake_sb):
        fake_sb.set_table_data("residents", [])

        response = admin_client.patch(
            "/api/residents/not-exist/email", json={"email": "nowy@gabi.pl"},
        )
        assert response.status_code == 404

    def test_zmiana_emaila_walidacja_formatu(self, admin_client):
        response = admin_client.patch(
            "/api/residents/r1/email", json={"email": "nie-email"},
        )
        assert response.status_code == 422


# --- POST /api/residents/:id/reset-password ----------------------------------

class TestResetResidentPassword:
    def test_reset_hasla_zwraca_haslo(self, admin_client, fake_sb):
        existing = {
            "id": "r1", "email": "adam@gabi.pl", "full_name": "Adam",
            "apartment_number": "5A", "role": "resident", "is_active": True,
            "has_account": True, "created_at": "2026-04-24T00:00:00",
        }
        fake_sb.set_table_data("residents", [existing])
        fake_sb.auth.admin = MagicMock()

        with patch("api.routes.residents.httpx.post") as httpx_post:
            httpx_post.return_value = SimpleNamespace(status_code=204, text="")
            response = admin_client.post("/api/residents/r1/reset-password")
        assert response.status_code == 200, response.text
        password = response.json()["password"]

        # Hasło spełnia wymagania siły (12 znaków, A-Z, a-z, cyfra)
        assert len(password) == 12
        assert any(c.isupper() for c in password)
        assert any(c.islower() for c in password)
        assert any(c.isdigit() for c in password)
        # Bez znaków łatwo mylonych
        assert not any(c in "0O1lI" for c in password)

        # auth.admin.update_user_by_id wywołane z password (i NIE z email)
        assert fake_sb.auth.admin.update_user_by_id.called
        args, _ = fake_sb.auth.admin.update_user_by_id.call_args
        assert args[0] == "r1"
        assert args[1]["password"] == password
        assert "email" not in args[1]

        # Stare sesje wszystkich urządzeń muszą zostać unieważnione
        assert httpx_post.called
        url = httpx_post.call_args[0][0]
        assert url.endswith("/auth/v1/admin/users/r1/logout")
        assert httpx_post.call_args[1]["params"]["scope"] == "global"

    def test_reset_hasla_dla_mieszkanca_bez_konta_zwraca_400(self, admin_client, fake_sb):
        existing = {
            "id": "r1", "email": None, "full_name": "Adam",
            "apartment_number": "5A", "role": "resident", "is_active": True,
            "has_account": False, "created_at": "2026-04-24T00:00:00",
        }
        fake_sb.set_table_data("residents", [existing])

        response = admin_client.post("/api/residents/r1/reset-password")
        assert response.status_code == 400
        assert "nie ma konta" in response.json()["detail"]

    def test_reset_hasla_nieistniejacego_zwraca_404(self, admin_client, fake_sb):
        fake_sb.set_table_data("residents", [])

        response = admin_client.post("/api/residents/not-exist/reset-password")
        assert response.status_code == 404


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
