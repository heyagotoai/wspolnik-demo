"""Testy przypomnień o nieoddanych głosach w uchwałach.

Pokrywa:
- is_within_reminder_window (pure)
- find_pending_voters (filtry: aktywność, email, głosowanie, uprawnienia)
- POST /api/resolutions/{id}/remind (dry_run, wysyłka, wymóg statusu voting)
- Cron /api/resolutions/cron/remind-pending (pomija testowe, pomija już wysłane, pomija poza oknem)
"""

from datetime import date
from unittest.mock import patch

import pytest


RESOLUTION_VOTING = {
    "id": "res-1",
    "title": "Wymiana windy",
    "description": None,
    "document_id": None,
    "voting_start": "2026-04-01",
    "voting_end": "2026-04-22",  # 2 dni od 2026-04-20
    "status": "voting",
    "created_at": "2026-03-20T10:00:00",
    "is_test": False,
    "reminder_sent_at": None,
}


# --- is_within_reminder_window ----------------------------------------------

class TestReminderWindow:
    def test_dzis_dokladnie_2_dni_przed_konca(self):
        from api.core.resolution_reminders import is_within_reminder_window

        assert is_within_reminder_window("2026-04-22", today=date(2026, 4, 20)) is True

    def test_dzis_dzien_konca_glosowania(self):
        from api.core.resolution_reminders import is_within_reminder_window

        assert is_within_reminder_window("2026-04-22", today=date(2026, 4, 22)) is True

    def test_3_dni_przed_konca_poza_oknem(self):
        from api.core.resolution_reminders import is_within_reminder_window

        assert is_within_reminder_window("2026-04-22", today=date(2026, 4, 19)) is False

    def test_po_koncu_glosowania_poza_oknem(self):
        from api.core.resolution_reminders import is_within_reminder_window

        assert is_within_reminder_window("2026-04-22", today=date(2026, 4, 23)) is False

    def test_brak_voting_end_false(self):
        from api.core.resolution_reminders import is_within_reminder_window

        assert is_within_reminder_window(None, today=date(2026, 4, 20)) is False


# --- find_pending_voters ----------------------------------------------------

class TestFindPendingVoters:
    def test_pomija_tych_co_juz_glosowali(self, fake_sb):
        from api.core.resolution_reminders import find_pending_voters

        fake_sb.set_table_data("residents", [
            {"id": "r1", "email": "a@x.pl", "full_name": "A", "role": "resident", "is_active": True},
            {"id": "r2", "email": "b@x.pl", "full_name": "B", "role": "resident", "is_active": True},
        ])
        fake_sb.set_table_data("votes", [{"resident_id": "r1"}])
        pending = find_pending_voters(fake_sb, "res-1")
        assert len(pending) == 1
        assert pending[0]["email"] == "b@x.pl"

    def test_pomija_nieaktywnych(self, fake_sb):
        from api.core.resolution_reminders import find_pending_voters

        fake_sb.set_table_data("residents", [
            {"id": "r1", "email": "a@x.pl", "full_name": "A", "role": "resident", "is_active": False},
        ])
        fake_sb.set_table_data("votes", [])
        assert find_pending_voters(fake_sb, "res-1") == []

    def test_pomija_bez_emaila(self, fake_sb):
        from api.core.resolution_reminders import find_pending_voters

        fake_sb.set_table_data("residents", [
            {"id": "r1", "email": "", "full_name": "A", "role": "resident", "is_active": True},
            {"id": "r2", "email": None, "full_name": "B", "role": "resident", "is_active": True},
        ])
        fake_sb.set_table_data("votes", [])
        assert find_pending_voters(fake_sb, "res-1") == []

    def test_admin_bez_lokalu_pominiety(self, fake_sb):
        """Admin bez przypisanego lokalu nie jest uprawniony do głosu — pomijany."""
        from api.core.resolution_reminders import find_pending_voters

        fake_sb.set_table_data("residents", [
            {"id": "admin-1", "email": "adm@x.pl", "full_name": "Adm", "role": "admin", "is_active": True},
        ])
        fake_sb.set_table_data("votes", [])
        fake_sb.set_table_data("apartments", [])
        assert find_pending_voters(fake_sb, "res-1") == []


# --- POST /api/resolutions/{id}/remind --------------------------------------

class TestRemindEndpoint:
    def test_wymaga_statusu_voting(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [{**RESOLUTION_VOTING, "status": "draft"}])
        fake_sb.set_table_data("residents", [])
        fake_sb.set_table_data("votes", [])

        r = admin_client.post("/api/resolutions/res-1/remind?dry_run=true")
        assert r.status_code == 400

    def test_dry_run_zwraca_liste_bez_wysylki(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_VOTING])
        fake_sb.set_table_data("residents", [
            {"id": "r1", "email": "tlen@x.pl", "full_name": "Tlen", "role": "resident", "is_active": True},
            {"id": "r2", "email": "wp@x.pl", "full_name": "Wp", "role": "resident", "is_active": True},
        ])
        fake_sb.set_table_data("votes", [{"resident_id": "r2"}])

        with patch("api.routes.resolutions._send_reminder_email") as send_mock:
            r = admin_client.post("/api/resolutions/res-1/remind?dry_run=true")

        assert r.status_code == 200
        data = r.json()
        assert data["dry_run"] is True
        assert data["recipients"] == ["tlen@x.pl"]
        assert data["sent"] == 0
        send_mock.assert_not_called()

    def test_wysylka_do_tych_ktorzy_nie_glosowali(self, admin_client, fake_sb, monkeypatch):
        fake_sb.set_table_data("resolutions", [RESOLUTION_VOTING])
        fake_sb.set_table_data("residents", [
            {"id": "r1", "email": "tlen@x.pl", "full_name": "Tlen", "role": "resident", "is_active": True},
            {"id": "r2", "email": "wp@x.pl", "full_name": "Wp", "role": "resident", "is_active": True},
        ])
        fake_sb.set_table_data("votes", [{"resident_id": "r2"}])
        monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
        monkeypatch.setenv("SUPABASE_ANON_KEY", "anon")

        with patch("api.routes.resolutions._send_reminder_email", return_value=True) as send_mock:
            r = admin_client.post("/api/resolutions/res-1/remind?dry_run=false")

        assert r.status_code == 200
        assert r.json()["sent"] == 1
        send_mock.assert_called_once()
        sent_to = send_mock.call_args[0][2]
        assert sent_to == "tlen@x.pl"

    def test_whitelist_emails_ogranicza_odbiorcow(self, admin_client, fake_sb, monkeypatch):
        """Gdy admin poda body.emails — wysyłka idzie tylko do przecięcia z pending."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_VOTING])
        fake_sb.set_table_data("residents", [
            {"id": "r1", "email": "tlen@x.pl", "full_name": "Tlen", "role": "resident", "is_active": True},
            {"id": "r2", "email": "wp@x.pl", "full_name": "Wp", "role": "resident", "is_active": True},
            {"id": "r3", "email": "onet@x.pl", "full_name": "Onet", "role": "resident", "is_active": True},
        ])
        fake_sb.set_table_data("votes", [])
        monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
        monkeypatch.setenv("SUPABASE_ANON_KEY", "anon")

        with patch("api.routes.resolutions._send_reminder_email", return_value=True) as send_mock:
            r = admin_client.post(
                "/api/resolutions/res-1/remind?dry_run=false",
                json={"emails": ["tlen@x.pl"]},
            )

        assert r.status_code == 200
        assert r.json()["sent"] == 1
        send_mock.assert_called_once()
        assert send_mock.call_args[0][2] == "tlen@x.pl"

    def test_whitelist_pomija_adresy_spoza_pending(self, admin_client, fake_sb, monkeypatch):
        """Adres spoza listy pending (np. już głosujący) jest pomijany mimo podania w whitelist."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_VOTING])
        fake_sb.set_table_data("residents", [
            {"id": "r1", "email": "tlen@x.pl", "full_name": "Tlen", "role": "resident", "is_active": True},
            {"id": "r2", "email": "wp@x.pl", "full_name": "Wp", "role": "resident", "is_active": True},
        ])
        fake_sb.set_table_data("votes", [{"resident_id": "r2"}])
        monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
        monkeypatch.setenv("SUPABASE_ANON_KEY", "anon")

        with patch("api.routes.resolutions._send_reminder_email", return_value=True) as send_mock:
            r = admin_client.post(
                "/api/resolutions/res-1/remind?dry_run=false",
                json={"emails": ["wp@x.pl", "tlen@x.pl"]},
            )

        assert r.status_code == 200
        # wp@x.pl zagłosował → pomijany; tylko tlen@x.pl dostaje maila
        assert r.json()["sent"] == 1
        send_mock.assert_called_once()
        assert send_mock.call_args[0][2] == "tlen@x.pl"

    def test_ignoruje_is_test_przy_recznym_wywolaniu(self, admin_client, fake_sb, monkeypatch):
        """Dla uchwały testowej można wysłać ręcznie — dry_run i send ignorują flagę is_test."""
        fake_sb.set_table_data("resolutions", [{**RESOLUTION_VOTING, "is_test": True}])
        fake_sb.set_table_data("residents", [
            {"id": "r1", "email": "tlen@x.pl", "full_name": "Tlen", "role": "resident", "is_active": True},
        ])
        fake_sb.set_table_data("votes", [])
        monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
        monkeypatch.setenv("SUPABASE_ANON_KEY", "anon")

        with patch("api.routes.resolutions._send_reminder_email", return_value=True):
            r = admin_client.post("/api/resolutions/res-1/remind?dry_run=false")

        assert r.status_code == 200
        assert r.json()["sent"] == 1


# --- Cron /api/resolutions/cron/remind-pending ------------------------------

class TestRemindCron:
    def test_wymaga_sekretu(self, client):
        assert client.get("/api/resolutions/cron/remind-pending").status_code == 401

    def test_pomija_uchwaly_testowe(self, client, fake_sb, monkeypatch):
        from api.core import resolution_voting_window

        monkeypatch.setattr(resolution_voting_window, "local_today_pl", lambda: date(2026, 4, 20))
        fake_sb.set_table_data("resolutions", [{**RESOLUTION_VOTING, "is_test": True}])
        fake_sb.set_table_data("residents", [
            {"id": "r1", "email": "tlen@x.pl", "full_name": "Tlen", "role": "resident", "is_active": True},
        ])
        fake_sb.set_table_data("votes", [])

        with patch("api.routes.resolutions.CRON_SECRET", "secret"), \
             patch("api.routes.resolutions._send_reminder_email") as send_mock:
            r = client.get(
                "/api/resolutions/cron/remind-pending",
                headers={"Authorization": "Bearer secret"},
            )
        assert r.status_code == 200
        assert r.json()["processed"] == 0
        send_mock.assert_not_called()

    def test_pomija_juz_wyslane(self, client, fake_sb, monkeypatch):
        from api.core import resolution_voting_window

        monkeypatch.setattr(resolution_voting_window, "local_today_pl", lambda: date(2026, 4, 20))
        fake_sb.set_table_data("resolutions", [
            {**RESOLUTION_VOTING, "reminder_sent_at": "2026-04-20T08:00:00Z"},
        ])
        fake_sb.set_table_data("residents", [])
        fake_sb.set_table_data("votes", [])

        with patch("api.routes.resolutions.CRON_SECRET", "secret"), \
             patch("api.routes.resolutions._send_reminder_email") as send_mock:
            r = client.get(
                "/api/resolutions/cron/remind-pending",
                headers={"Authorization": "Bearer secret"},
            )
        assert r.status_code == 200
        assert r.json()["processed"] == 0
        send_mock.assert_not_called()

    def test_pomija_poza_oknem(self, client, fake_sb, monkeypatch):
        """3 dni przed końcem — poza oknem 2-dniowym."""
        from api.core import resolution_voting_window

        monkeypatch.setattr(resolution_voting_window, "local_today_pl", lambda: date(2026, 4, 19))
        fake_sb.set_table_data("resolutions", [RESOLUTION_VOTING])
        fake_sb.set_table_data("residents", [])
        fake_sb.set_table_data("votes", [])

        with patch("api.routes.resolutions.CRON_SECRET", "secret"), \
             patch("api.routes.resolutions._send_reminder_email") as send_mock:
            r = client.get(
                "/api/resolutions/cron/remind-pending",
                headers={"Authorization": "Bearer secret"},
            )
        assert r.status_code == 200
        assert r.json()["processed"] == 0
        send_mock.assert_not_called()

    def test_wysyla_w_oknie_bez_reminder_sent_at(self, client, fake_sb, monkeypatch):
        from api.core import resolution_voting_window

        monkeypatch.setattr(resolution_voting_window, "local_today_pl", lambda: date(2026, 4, 20))
        fake_sb.set_table_data("resolutions", [RESOLUTION_VOTING])
        fake_sb.set_table_data("residents", [
            {"id": "r1", "email": "tlen@x.pl", "full_name": "Tlen", "role": "resident", "is_active": True},
            {"id": "r2", "email": "wp@x.pl", "full_name": "Wp", "role": "resident", "is_active": True},
        ])
        fake_sb.set_table_data("votes", [{"resident_id": "r2"}])
        monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
        monkeypatch.setenv("SUPABASE_ANON_KEY", "anon")

        with patch("api.routes.resolutions.CRON_SECRET", "secret"), \
             patch("api.routes.resolutions._send_reminder_email", return_value=True) as send_mock:
            r = client.get(
                "/api/resolutions/cron/remind-pending",
                headers={"Authorization": "Bearer secret"},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["processed"] == 1
        assert data["sent"] == 1
        send_mock.assert_called_once()
        assert send_mock.call_args[0][2] == "tlen@x.pl"
