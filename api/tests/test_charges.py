"""Testy endpointów /api/charges.

Pokryte scenariusze:
- POST /api/charges/generate     — generowanie naliczeń (admin)
- GET  /api/charges/rates        — lista stawek
- POST /api/charges/rates        — dodawanie stawki (admin)
- DELETE /api/charges/rates/:id  — usuwanie stawki (admin)
"""

from types import SimpleNamespace
from unittest.mock import MagicMock

from api.tests.conftest import FakeSupabaseBuilder


APARTMENT_1 = {
    "id": "apt-1",
    "number": "1",
    "area_m2": "50.00",
    "declared_occupants": 2,
}

APARTMENT_2 = {
    "id": "apt-2",
    "number": "2",
    "area_m2": "75.50",
    "declared_occupants": 3,
}

APARTMENT_NO_AREA = {
    "id": "apt-3",
    "number": "3",
    "area_m2": None,
    "declared_occupants": 1,
}

APARTMENT_NO_OCCUPANTS = {
    "id": "apt-4",
    "number": "4",
    "area_m2": "40.00",
    "declared_occupants": 0,
}

APARTMENT_WITH_BALANCE_DATE = {
    "id": "apt-5",
    "number": "5",
    "area_m2": "60.00",
    "declared_occupants": 2,
    "initial_balance_date": "2026-03-01",
}

RATE_EKSPLOATACJA = {
    "id": "rate-1",
    "type": "eksploatacja",
    "rate_per_unit": "4.50",
    "valid_from": "2026-01-01",
    "created_at": "2026-01-01T00:00:00",
}

RATE_FUNDUSZ = {
    "id": "rate-2",
    "type": "fundusz_remontowy",
    "rate_per_unit": "2.00",
    "valid_from": "2026-01-01",
    "created_at": "2026-01-01T00:00:00",
}

RATE_SMIECI = {
    "id": "rate-3",
    "type": "smieci",
    "rate_per_unit": "28.00",
    "valid_from": "2026-01-01",
    "created_at": "2026-01-01T00:00:00",
}

ALL_RATES = [RATE_EKSPLOATACJA, RATE_FUNDUSZ, RATE_SMIECI]


def _setup_generate(fake_sb, apartments, rates, existing_charges=None):
    """Configure fake_sb for generate endpoint with table-specific routing."""
    original_table = fake_sb.table

    def routed_table(name):
        if name == "charges":
            data = existing_charges if existing_charges is not None else []
            return FakeSupabaseBuilder(data=list(data))
        if name == "apartments":
            return FakeSupabaseBuilder(data=list(apartments))
        if name == "charge_rates":
            return FakeSupabaseBuilder(data=list(rates))
        return original_table(name)

    fake_sb.table = MagicMock(side_effect=routed_table)


# --- POST /api/charges/generate -----------------------------------------------


class TestGenerateCharges:
    def test_generowanie_dla_dwoch_lokali(self, admin_client, fake_sb):
        _setup_generate(fake_sb, [APARTMENT_1, APARTMENT_2], ALL_RATES)

        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-03-01",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["apartments_count"] == 2
        # 2 apartments × 3 types = 6 charges
        assert data["charges_created"] == 6
        assert data["warnings"] == []
        # apt1: 50*4.50 + 50*2.00 + 2*28 = 225+100+56 = 381
        # apt2: 75.50*4.50 + 75.50*2.00 + 3*28 = 339.75+151.00+84 = 574.75
        assert data["total_amount"] == "955.75"

    def test_duplikat_generowania_409(self, admin_client, fake_sb):
        existing = [{"id": "ch-1"}]
        _setup_generate(fake_sb, [APARTMENT_1], ALL_RATES, existing_charges=existing)

        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-03-01",
        })
        assert response.status_code == 409
        assert "już wygenerowane" in response.json()["detail"]

    def test_regeneracja_z_force(self, admin_client, fake_sb):
        existing = [{"id": "ch-1"}]
        _setup_generate(fake_sb, [APARTMENT_1, APARTMENT_2], ALL_RATES, existing_charges=existing)

        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-03-01",
            "force": True,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["charges_created"] == 6
        assert data["regenerated"] is True

    def test_force_bez_istniejacych_nie_ustawia_regenerated(self, admin_client, fake_sb):
        _setup_generate(fake_sb, [APARTMENT_1], ALL_RATES)

        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-03-01",
            "force": True,
        })
        assert response.status_code == 201
        assert response.json()["regenerated"] is False

    def test_brak_stawek_400(self, admin_client, fake_sb):
        _setup_generate(fake_sb, [APARTMENT_1], [])

        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-03-01",
        })
        assert response.status_code == 400
        assert "stawek" in response.json()["detail"].lower()

    def test_brak_lokali_400(self, admin_client, fake_sb):
        _setup_generate(fake_sb, [], ALL_RATES)

        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-03-01",
        })
        assert response.status_code == 400
        assert "lokali" in response.json()["detail"].lower()

    def test_pomija_lokal_bez_powierzchni(self, admin_client, fake_sb):
        _setup_generate(fake_sb, [APARTMENT_NO_AREA], ALL_RATES)

        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-03-01",
        })
        assert response.status_code == 201
        data = response.json()
        # Only smieci (1 person × 28) = 28
        assert data["charges_created"] == 1
        assert data["total_amount"] == "28.00"
        assert any("brak powierzchni" in w for w in data["warnings"])

    def test_pomija_smieci_dla_0_mieszkancow(self, admin_client, fake_sb):
        _setup_generate(fake_sb, [APARTMENT_NO_OCCUPANTS], ALL_RATES)

        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-03-01",
        })
        assert response.status_code == 201
        data = response.json()
        # Only area-based: 40*4.50 + 40*2.00 = 180+80 = 260
        assert data["charges_created"] == 2
        assert data["total_amount"] == "260.00"
        assert any("0 mieszkańców" in w for w in data["warnings"])

    def test_ostrzezenie_data_salda_poczatkowego(self, admin_client, fake_sb):
        _setup_generate(fake_sb, [APARTMENT_WITH_BALANCE_DATE], ALL_RATES)

        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-03-01",
        })
        assert response.status_code == 201
        data = response.json()
        assert any("saldo początkowe" in w for w in data["warnings"])
        assert any("podwójne" in w for w in data["warnings"])

    def test_brak_ostrzezenia_gdy_miesiac_po_dacie_salda(self, admin_client, fake_sb):
        _setup_generate(fake_sb, [APARTMENT_WITH_BALANCE_DATE], ALL_RATES)

        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-04-01",
        })
        assert response.status_code == 201
        data = response.json()
        assert not any("saldo początkowe" in w for w in data["warnings"])

    def test_nieprawidlowy_format_miesiaca(self, admin_client, fake_sb):
        response = admin_client.post("/api/charges/generate", json={
            "month": "2026-03",
        })
        assert response.status_code == 400

    def test_wymaga_admina(self, resident_client, fake_sb):
        response = resident_client.post("/api/charges/generate", json={
            "month": "2026-03-01",
        })
        assert response.status_code == 403


# --- GET /api/charges/rates ---------------------------------------------------


class TestListRates:
    def test_lista_stawek(self, resident_client, fake_sb):
        fake_sb.set_table_data("charge_rates", ALL_RATES)

        response = resident_client.get("/api/charges/rates")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_niedostepne_bez_logowania(self, client):
        response = client.get("/api/charges/rates")
        assert response.status_code == 401


# --- POST /api/charges/rates -------------------------------------------------


class TestCreateRate:
    def test_dodawanie_stawki(self, admin_client, fake_sb):
        fake_sb.set_table_data("charge_rates", [RATE_EKSPLOATACJA])

        response = admin_client.post("/api/charges/rates", json={
            "type": "eksploatacja",
            "rate_per_unit": "5.00",
            "valid_from": "2026-04-01",
        })
        assert response.status_code == 201
        assert response.json()["type"] == "eksploatacja"

    def test_wymaga_admina(self, resident_client, fake_sb):
        response = resident_client.post("/api/charges/rates", json={
            "type": "eksploatacja",
            "rate_per_unit": "5.00",
            "valid_from": "2026-04-01",
        })
        assert response.status_code == 403


# --- DELETE /api/charges/rates/:id --------------------------------------------


class TestDeleteRate:
    def test_usuwanie_stawki(self, admin_client, fake_sb):
        fake_sb.set_table_data("charge_rates", [RATE_EKSPLOATACJA])

        response = admin_client.delete("/api/charges/rates/rate-1")
        assert response.status_code == 200
        assert "usunięta" in response.json()["detail"]

    def test_nieistniejaca_stawka_404(self, admin_client, fake_sb):
        fake_sb.set_table_data("charge_rates", [])

        response = admin_client.delete("/api/charges/rates/nonexistent")
        assert response.status_code == 404


# --- GET /api/charges/auto-config ---------------------------------------------


AUTO_CONFIG_DATA = [
    {"key": "auto_charges_enabled", "value": "false"},
    {"key": "auto_charges_day", "value": "5"},
]


class TestAutoConfig:
    def test_odczyt_konfiguracji(self, resident_client, fake_sb):
        fake_sb.set_table_data("system_settings", AUTO_CONFIG_DATA)

        response = resident_client.get("/api/charges/auto-config")
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is False
        assert data["day"] == 5

    def test_aktualizacja_wlaczenie(self, admin_client, fake_sb):
        fake_sb.set_table_data("system_settings", AUTO_CONFIG_DATA)

        response = admin_client.patch("/api/charges/auto-config", json={
            "enabled": True,
        })
        assert response.status_code == 200

    def test_aktualizacja_dnia(self, admin_client, fake_sb):
        fake_sb.set_table_data("system_settings", AUTO_CONFIG_DATA)

        response = admin_client.patch("/api/charges/auto-config", json={
            "day": 15,
        })
        assert response.status_code == 200

    def test_aktualizacja_wymaga_admina(self, resident_client, fake_sb):
        response = resident_client.patch("/api/charges/auto-config", json={
            "enabled": True,
        })
        assert response.status_code == 403


# --- POST /api/charges/cron --------------------------------------------------


class TestCron:
    def test_brak_sekretu_401(self, client, fake_sb):
        response = client.post("/api/charges/cron")
        assert response.status_code == 401

    def test_nieprawidlowy_sekret_401(self, client, fake_sb):
        response = client.post(
            "/api/charges/cron",
            headers={"Authorization": "Bearer wrong-secret"},
        )
        assert response.status_code == 401

    def test_wylaczone_auto_zwraca_skipped(self, client, fake_sb):
        from unittest.mock import patch
        with patch("api.routes.charges.CRON_SECRET", "test-secret"):
            fake_sb.set_table_data("system_settings", [
                {"key": "auto_charges_enabled", "value": "false"},
                {"key": "auto_charges_day", "value": "1"},
            ])

            response = client.post(
                "/api/charges/cron",
                headers={"Authorization": "Bearer test-secret"},
            )
            assert response.status_code == 200
            assert response.json()["status"] == "skipped"
            assert "disabled" in response.json()["reason"]
