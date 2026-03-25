"""Tests for charge notification endpoints (zawiadomienie o opłatach)."""

from unittest.mock import patch

RATE_EKSPL = {
    "id": "rate-1",
    "type": "eksploatacja",
    "rate_per_unit": "4.50",
    "valid_from": "2025-12-01",
}
RATE_FUND = {
    "id": "rate-2",
    "type": "fundusz_remontowy",
    "rate_per_unit": "3.68",
    "valid_from": "2025-12-01",
}
RATE_SMIECI = {
    "id": "rate-3",
    "type": "smieci",
    "rate_per_unit": "32.00",
    "valid_from": "2025-12-01",
}

ALL_RATES = [RATE_EKSPL, RATE_FUND, RATE_SMIECI]

APARTMENT_1 = {
    "id": "apt-1",
    "number": "7",
    "area_m2": "22.05",
    "declared_occupants": 1,
    "owner_resident_id": "res-1",
}

APARTMENT_NO_OWNER = {
    "id": "apt-2",
    "number": "3",
    "area_m2": "30.00",
    "declared_occupants": 2,
    "owner_resident_id": None,
}

RESIDENTS = [
    {"id": "res-1", "email": "jan@gabi.pl", "full_name": "Jan Kowalski"},
]

LEGAL_BASIS_SETTING = {
    "key": "zawiadomienie_legal_basis",
    "value": "Testowa podstawa prawna.",
}


def _env_side_effect(k, *_):
    return {"SUPABASE_URL": "https://test.supabase.co", "SUPABASE_ANON_KEY": "test-key"}.get(k, "")


# ── Auth tests ──────────────────────────────────────────


class TestChargeNotificationAuth:
    def test_preview_wymaga_admina(self, client, fake_sb):
        r = client.get("/api/charges/charge-notification-preview/apt-1")
        assert r.status_code == 401

    def test_send_wymaga_admina(self, client, fake_sb):
        r = client.post("/api/charges/charge-notification/apt-1")
        assert r.status_code == 401

    def test_bulk_wymaga_admina(self, client, fake_sb):
        r = client.post("/api/charges/charge-notification-bulk", json={"apartment_ids": []})
        assert r.status_code == 401

    def test_preview_odrzuca_mieszkanca(self, client, resident_headers, fake_sb):
        r = client.get("/api/charges/charge-notification-preview/apt-1", headers=resident_headers)
        assert r.status_code == 403

    def test_config_get_dostepny_dla_zalogowanego(self, resident_client, fake_sb):
        fake_sb.set_table_data("system_settings", [LEGAL_BASIS_SETTING])
        r = resident_client.get("/api/charges/zawiadomienie-config")
        assert r.status_code == 200

    def test_config_patch_wymaga_admina(self, client, fake_sb):
        r = client.patch("/api/charges/zawiadomienie-config", json={"legal_basis": "test"})
        assert r.status_code == 401


# ── Preview tests ───────────────────────────────────────


class TestChargeNotificationPreview:
    def test_preview_zwraca_pdf(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [APARTMENT_1])
        fake_sb.set_table_data("charge_rates", ALL_RATES)
        fake_sb.set_table_data("system_settings", [LEGAL_BASIS_SETTING])

        r = admin_client.get("/api/charges/charge-notification-preview/apt-1")

        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF"
        assert "zawiadomienie_lokal_7" in r.headers.get("content-disposition", "")

    def test_preview_lokal_nie_istnieje(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [])
        fake_sb.set_table_data("charge_rates", ALL_RATES)
        fake_sb.set_table_data("system_settings", [])

        r = admin_client.get("/api/charges/charge-notification-preview/nonexistent")

        assert r.status_code == 400

    def test_preview_brak_stawek(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [APARTMENT_1])
        fake_sb.set_table_data("charge_rates", [])
        fake_sb.set_table_data("system_settings", [])

        r = admin_client.get("/api/charges/charge-notification-preview/apt-1")

        assert r.status_code == 400


# ── Single send tests ──────────────────────────────────


class TestChargeNotificationSend:
    def test_wysylka_sukces(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [APARTMENT_1])
        fake_sb.set_table_data("charge_rates", ALL_RATES)
        fake_sb.set_table_data("residents", RESIDENTS)
        fake_sb.set_table_data("system_settings", [LEGAL_BASIS_SETTING])

        with (
            patch("api.routes.charges.os.environ.get", side_effect=_env_side_effect),
            patch("api.routes.charges.httpx.post") as mock_http,
            patch("api.routes.charges.build_zawiadomienie_pdf", return_value=b"%PDF-1.4 test"),
        ):
            mock_http.return_value.status_code = 200
            r = admin_client.post("/api/charges/charge-notification/apt-1")

        assert r.status_code == 200
        assert "lokal 7" in r.json()["detail"]
        mock_http.assert_called_once()

    def test_lokal_bez_wlasciciela(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [APARTMENT_NO_OWNER])
        fake_sb.set_table_data("charge_rates", ALL_RATES)
        fake_sb.set_table_data("residents", RESIDENTS)
        fake_sb.set_table_data("system_settings", [])

        r = admin_client.post("/api/charges/charge-notification/apt-2")

        assert r.status_code == 400


# ── Bulk send tests ─────────────────────────────────────


class TestChargeNotificationBulk:
    def test_pusta_lista(self, admin_client, fake_sb):
        fake_sb.set_table_data("system_settings", [])
        fake_sb.set_table_data("charge_rates", ALL_RATES)

        r = admin_client.post("/api/charges/charge-notification-bulk", json={"apartment_ids": []})

        assert r.status_code == 200
        assert r.json() == {"sent": [], "failed": []}

    def test_bulk_wysylka_sukces(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [APARTMENT_1])
        fake_sb.set_table_data("charge_rates", ALL_RATES)
        fake_sb.set_table_data("residents", RESIDENTS)
        fake_sb.set_table_data("system_settings", [LEGAL_BASIS_SETTING])

        with (
            patch("api.routes.charges.os.environ.get", side_effect=_env_side_effect),
            patch("api.routes.charges.httpx.post") as mock_http,
            patch("api.routes.charges.build_zawiadomienie_pdf", return_value=b"%PDF-1.4 test"),
        ):
            mock_http.return_value.status_code = 200
            r = admin_client.post(
                "/api/charges/charge-notification-bulk",
                json={"apartment_ids": ["apt-1"]},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["sent"] == ["7"]
        assert data["failed"] == []

    def test_bulk_failed_bez_wlasciciela(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [APARTMENT_NO_OWNER])
        fake_sb.set_table_data("charge_rates", ALL_RATES)
        fake_sb.set_table_data("residents", RESIDENTS)
        fake_sb.set_table_data("system_settings", [])

        r = admin_client.post(
            "/api/charges/charge-notification-bulk",
            json={"apartment_ids": ["apt-2"]},
        )

        assert r.status_code == 200
        data = r.json()
        assert data["sent"] == []
        assert len(data["failed"]) == 1

    def test_wynik_zawiera_sent_i_failed(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [])
        fake_sb.set_table_data("charge_rates", ALL_RATES)
        fake_sb.set_table_data("system_settings", [])

        r = admin_client.post(
            "/api/charges/charge-notification-bulk",
            json={"apartment_ids": ["nonexistent"]},
        )

        assert r.status_code == 200
        data = r.json()
        assert "sent" in data
        assert "failed" in data


# ── Config tests ────────────────────────────────────────


class TestZawiadomienieConfig:
    def test_get_config_zwraca_domyslny(self, resident_client, fake_sb):
        fake_sb.set_table_data("system_settings", [])

        r = resident_client.get("/api/charges/zawiadomienie-config")

        assert r.status_code == 200
        data = r.json()
        assert "legal_basis" in data
        # Default fallback when no setting in DB
        assert "GABI" in data["legal_basis"]

    def test_get_config_zwraca_z_bazy(self, resident_client, fake_sb):
        fake_sb.set_table_data("system_settings", [LEGAL_BASIS_SETTING])

        r = resident_client.get("/api/charges/zawiadomienie-config")

        assert r.status_code == 200
        assert r.json()["legal_basis"] == "Testowa podstawa prawna."

    def test_patch_config(self, admin_client, fake_sb):
        fake_sb.set_table_data("system_settings", [LEGAL_BASIS_SETTING])

        r = admin_client.patch(
            "/api/charges/zawiadomienie-config",
            json={"legal_basis": "Nowy tekst."},
        )

        assert r.status_code == 200
