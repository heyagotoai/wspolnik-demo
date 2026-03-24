"""Tests for bulk balance notification endpoint (POST /api/charges/balance-notification-bulk)."""

from unittest.mock import patch

APARTMENT_1 = {
    "id": "apt-1",
    "number": "1",
    "initial_balance": "0.00",
    "owner_resident_id": "res-1",
}

APARTMENT_2 = {
    "id": "apt-2",
    "number": "2",
    "initial_balance": "-150.00",
    "owner_resident_id": "res-2",
}

APARTMENT_NO_OWNER = {
    "id": "apt-3",
    "number": "3",
    "initial_balance": "0.00",
    "owner_resident_id": None,
}

RESIDENTS = [
    {"id": "res-1", "email": "jan@gabi.pl", "full_name": "Jan Kowalski"},
    {"id": "res-2", "email": "anna@gabi.pl", "full_name": "Anna Nowak"},
]


def _env_side_effect(k, *_):
    return {"SUPABASE_URL": "https://test.supabase.co", "SUPABASE_ANON_KEY": "test-key"}.get(k, "")


class TestBulkBalanceNotificationAuth:
    def test_wymaga_admina(self, client, fake_sb):
        r = client.post("/api/charges/balance-notification-bulk", json={"apartment_ids": ["apt-1"]})
        assert r.status_code == 401

    def test_odrzuca_mieszkanca(self, client, resident_headers, fake_sb):
        r = client.post(
            "/api/charges/balance-notification-bulk",
            headers=resident_headers,
            json={"apartment_ids": ["apt-1"]},
        )
        assert r.status_code == 403


class TestBulkBalanceNotificationSend:
    def test_pusta_lista_zwraca_puste_wyniki(self, admin_client, fake_sb):
        r = admin_client.post("/api/charges/balance-notification-bulk", json={"apartment_ids": []})
        assert r.status_code == 200
        assert r.json() == {"sent": [], "failed": []}

    def test_wysylka_do_jednego_lokalu(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [APARTMENT_1])
        fake_sb.set_table_data("residents", RESIDENTS)
        fake_sb.set_table_data("charges", [])
        fake_sb.set_table_data("payments", [])

        with (
            patch("api.routes.charges.os.environ.get", side_effect=_env_side_effect),
            patch("api.routes.charges.httpx.post") as mock_http,
            patch("api.routes.charges.build_saldo_pdf", return_value=b"%PDF-1.4 test"),
        ):
            mock_http.return_value.status_code = 200
            r = admin_client.post(
                "/api/charges/balance-notification-bulk",
                json={"apartment_ids": ["apt-1"]},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["sent"] == ["1"]
        assert data["failed"] == []
        mock_http.assert_called_once()

    def test_wysylka_do_wielu_lokali(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [APARTMENT_1, APARTMENT_2])
        fake_sb.set_table_data("residents", RESIDENTS)
        fake_sb.set_table_data("charges", [])
        fake_sb.set_table_data("payments", [])

        with (
            patch("api.routes.charges.os.environ.get", side_effect=_env_side_effect),
            patch("api.routes.charges.httpx.post") as mock_http,
            patch("api.routes.charges.build_saldo_pdf", return_value=b"%PDF-1.4 test"),
        ):
            mock_http.return_value.status_code = 200
            r = admin_client.post(
                "/api/charges/balance-notification-bulk",
                json={"apartment_ids": ["apt-1", "apt-2"]},
            )

        assert r.status_code == 200
        data = r.json()
        # FakeSupabase nie filtruje po eq — obie próby kończą się wysłaniem
        assert len(data["sent"]) == 2
        assert data["failed"] == []
        assert mock_http.call_count == 2

    def test_lokal_bez_wlasciciela_trafia_do_failed(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [APARTMENT_NO_OWNER])
        fake_sb.set_table_data("residents", RESIDENTS)
        fake_sb.set_table_data("charges", [])
        fake_sb.set_table_data("payments", [])

        with (
            patch("api.routes.charges.os.environ.get", side_effect=_env_side_effect),
            patch("api.routes.charges.httpx.post") as mock_http,
            patch("api.routes.charges.build_saldo_pdf", return_value=b"%PDF-1.4 test"),
        ):
            r = admin_client.post(
                "/api/charges/balance-notification-bulk",
                json={"apartment_ids": ["apt-3"]},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["sent"] == []
        assert len(data["failed"]) == 1
        assert data["failed"][0]["number"] == "3"
        mock_http.assert_not_called()

    def test_blad_edge_function_trafia_do_failed(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [APARTMENT_1])
        fake_sb.set_table_data("residents", RESIDENTS)
        fake_sb.set_table_data("charges", [])
        fake_sb.set_table_data("payments", [])

        with (
            patch("api.routes.charges.os.environ.get", side_effect=_env_side_effect),
            patch("api.routes.charges.httpx.post") as mock_http,
            patch("api.routes.charges.build_saldo_pdf", return_value=b"%PDF-1.4 test"),
        ):
            mock_http.return_value.status_code = 500
            mock_http.return_value.text = "Internal Server Error"
            r = admin_client.post(
                "/api/charges/balance-notification-bulk",
                json={"apartment_ids": ["apt-1"]},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["sent"] == []
        assert len(data["failed"]) == 1
        assert data["failed"][0]["number"] == "1"

    def test_wynik_zawiera_sent_i_failed_klucze(self, admin_client, fake_sb):
        """Struktura odpowiedzi zawsze zawiera sent i failed."""
        fake_sb.set_table_data("apartments", [APARTMENT_NO_OWNER])
        fake_sb.set_table_data("residents", RESIDENTS)
        fake_sb.set_table_data("charges", [])
        fake_sb.set_table_data("payments", [])

        r = admin_client.post(
            "/api/charges/balance-notification-bulk",
            json={"apartment_ids": ["apt-3"]},
        )

        assert r.status_code == 200
        data = r.json()
        assert "sent" in data
        assert "failed" in data
        assert isinstance(data["sent"], list)
        assert isinstance(data["failed"], list)

    def test_nieistniejacy_lokal_trafia_do_failed(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [])
        fake_sb.set_table_data("residents", RESIDENTS)

        with patch("api.routes.charges.build_saldo_pdf", return_value=b"%PDF-1.4 test"):
            r = admin_client.post(
                "/api/charges/balance-notification-bulk",
                json={"apartment_ids": ["nonexistent-id"]},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["sent"] == []
        assert len(data["failed"]) == 1
