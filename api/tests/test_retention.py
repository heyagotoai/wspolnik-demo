"""Tests for /api/retention/cron — financial data retention (5 years)."""

from decimal import Decimal
from unittest.mock import patch


class TestRetentionCron:
    def test_brak_sekretu_401(self, client, fake_sb):
        response = client.get("/api/retention/cron")
        assert response.status_code == 401

    def test_nieprawidlowy_sekret_401(self, client, fake_sb):
        response = client.get(
            "/api/retention/cron",
            headers={"Authorization": "Bearer wrong-secret"},
        )
        assert response.status_code == 401

    def test_post_brak_sekretu_401(self, client, fake_sb):
        response = client.post("/api/retention/cron")
        assert response.status_code == 401

    def test_successful_run_no_data(self, client, fake_sb):
        """Cron z pustymi tabelami — nic do usunięcia."""
        with patch("api.routes.retention.CRON_SECRET", "test-secret"), \
             patch("api.routes.retention._send_notification"):
            for t in ["charges", "payments", "bank_statements", "audit_log", "apartments"]:
                fake_sb.set_table_data(t, [])

            response = client.get(
                "/api/retention/cron",
                headers={"Authorization": "Bearer test-secret"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["total_deleted"] == 0
            assert data["total_expiring"] == 0
            assert data["apartments_balance_updated"] == 0
            assert "charges" in data["details"]
            assert "payments" in data["details"]
            assert "bank_statements" in data["details"]
            assert "audit_log" in data["details"]

    def test_sends_notification(self, client, fake_sb):
        """Cron wysyła powiadomienie email."""
        with patch("api.routes.retention.CRON_SECRET", "test-secret"), \
             patch("api.routes.retention._send_notification") as mock_notify:
            for t in ["charges", "payments", "bank_statements", "audit_log", "apartments"]:
                fake_sb.set_table_data(t, [])

            response = client.get(
                "/api/retention/cron",
                headers={"Authorization": "Bearer test-secret"},
            )

            assert response.status_code == 200
            mock_notify.assert_called_once()
            call_args = mock_notify.call_args
            assert "Retencja" in call_args[1]["subject"] or "Retencja" in call_args[0][0]

    def test_post_method_works(self, client, fake_sb):
        """POST też jest akceptowany (kompatybilność)."""
        with patch("api.routes.retention.CRON_SECRET", "test-secret"), \
             patch("api.routes.retention._send_notification"):
            for t in ["charges", "payments", "bank_statements", "audit_log", "apartments"]:
                fake_sb.set_table_data(t, [])

            response = client.post(
                "/api/retention/cron",
                headers={"Authorization": "Bearer test-secret"},
            )

            assert response.status_code == 200


class TestCarryForwardBalances:
    def test_carry_forward_updates_initial_balance(self, fake_sb):
        """Przeniesienie salda: initial_balance += payments - charges."""
        from api.routes.retention import _carry_forward_balances

        fake_sb.set_table_data("apartments", [
            {"id": "apt-1", "initial_balance": 100},
        ])
        # Stare naliczenia: 300 zł
        fake_sb.set_table_data("charges", [
            {"apartment_id": "apt-1", "amount": "200", "month": "2020-01-01"},
            {"apartment_id": "apt-1", "amount": "100", "month": "2020-02-01"},
        ])
        # Stare wpłaty: 500 zł
        fake_sb.set_table_data("payments", [
            {"apartment_id": "apt-1", "amount": "500", "payment_date": "2020-01-15"},
        ])

        updated = _carry_forward_balances(fake_sb, "2021-04-03T00:00:00+00:00")

        assert updated == 1

    def test_carry_forward_skips_when_no_old_records(self, fake_sb):
        """Lokal bez starych rekordów — pominięty."""
        from api.routes.retention import _carry_forward_balances

        fake_sb.set_table_data("apartments", [
            {"id": "apt-1", "initial_balance": 0},
        ])
        fake_sb.set_table_data("charges", [])
        fake_sb.set_table_data("payments", [])

        updated = _carry_forward_balances(fake_sb, "2021-04-03T00:00:00+00:00")

        assert updated == 0

    def test_carry_forward_no_apartments(self, fake_sb):
        """Brak lokali — 0 zaktualizowanych."""
        from api.routes.retention import _carry_forward_balances

        fake_sb.set_table_data("apartments", [])

        updated = _carry_forward_balances(fake_sb, "2021-04-03T00:00:00+00:00")

        assert updated == 0


class TestRetentionNotification:
    def test_notification_sends_to_admins_and_managers(self, fake_sb):
        """Powiadomienie wysyłane do adminów i zarządców."""
        from api.routes.retention import _send_notification

        fake_sb.set_table_data("residents", [
            {"email": "admin@gabi.pl", "role": "admin", "is_active": True},
            {"email": "manager@gabi.pl", "role": "manager", "is_active": True},
        ])

        with patch("api.routes.retention.get_supabase", return_value=fake_sb), \
             patch("api.routes.retention.SUPABASE_URL", "https://test.supabase.co"), \
             patch.dict("os.environ", {"SUPABASE_ANON_KEY": "test-anon-key"}), \
             patch("api.routes.retention.httpx.post") as mock_post:
            _send_notification(subject="Test", body="Test body")

            assert mock_post.call_count == 2

    def test_notification_skips_when_no_recipients(self, fake_sb):
        """Brak błędu gdy nie ma odbiorców."""
        from api.routes.retention import _send_notification

        fake_sb.set_table_data("residents", [])

        with patch("api.routes.retention.get_supabase", return_value=fake_sb), \
             patch("api.routes.retention.httpx.post") as mock_post:
            _send_notification(subject="Test", body="Test body")

            mock_post.assert_not_called()
