"""Tests for POST /api/backup/cron — weekly backup to Supabase Storage."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch


ALL_TABLES = [
    "apartments", "residents", "charges", "payments",
    "charge_rates", "bank_statements", "resolutions",
    "votes", "system_settings",
]


def _setup_empty_tables(fake_sb):
    """Set all backup tables to empty data."""
    for table in ALL_TABLES:
        fake_sb.set_table_data(table, [])


def _setup_storage_mock(fake_sb, backup_files=None, doc_files=None):
    """Create a storage mock that returns different data per bucket."""
    backup_files = backup_files or []
    doc_files = doc_files or []

    buckets = {}

    def make_bucket(files, download_data=None):
        bucket = MagicMock()
        bucket.list.return_value = files
        if download_data is not None:
            bucket.download.return_value = download_data
        return bucket

    backup_bucket = make_bucket(backup_files)
    doc_bucket = make_bucket(doc_files, download_data=b"%PDF-fake")

    def from_(name):
        if name not in buckets:
            if name == "documents":
                buckets[name] = doc_bucket
            else:
                buckets[name] = backup_bucket
        return buckets[name]

    mock_storage = MagicMock()
    mock_storage.from_ = from_
    fake_sb.storage = mock_storage
    return backup_bucket, doc_bucket


# --- POST /api/backup/cron ---------------------------------------------------


class TestBackupCron:
    def test_brak_sekretu_401(self, client, fake_sb):
        response = client.post("/api/backup/cron")
        assert response.status_code == 401

    def test_nieprawidlowy_sekret_401(self, client, fake_sb):
        response = client.post(
            "/api/backup/cron",
            headers={"Authorization": "Bearer wrong-secret"},
        )
        assert response.status_code == 401

    def test_successful_backup(self, client, fake_sb):
        """Full backup flow: export tables + auth users + documents + upload + cleanup."""
        with patch("api.routes.backup.CRON_SECRET", "test-secret"), \
             patch("api.routes.backup._send_notification"):
            # Setup table data
            fake_sb.set_table_data("apartments", [
                {"id": "a1", "number": "1", "area_m2": 50},
            ])
            fake_sb.set_table_data("residents", [
                {"id": "r1", "full_name": "Jan Kowalski", "email": "jan@gabi.pl"},
            ])
            for table in ALL_TABLES[2:]:
                fake_sb.set_table_data(table, [])

            fake_sb.auth.admin.list_users.return_value = [
                SimpleNamespace(
                    id="r1",
                    email="jan@gabi.pl",
                    created_at=None,
                    last_sign_in_at=None,
                    user_metadata={"full_name": "Jan Kowalski"},
                ),
            ]

            backup_bucket, doc_bucket = _setup_storage_mock(
                fake_sb,
                doc_files=[{"name": "regulamin.pdf"}],
            )

            response = client.post(
                "/api/backup/cron",
                headers={"Authorization": "Bearer test-secret"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "completed"
            assert data["tables_exported"] == 9
            assert data["auth_users_exported"] == 1
            assert data["documents_exported"] == 1
            assert data["size_bytes"] > 0

            backup_bucket.upload.assert_called_once()

    def test_cleanup_old_backups(self, client, fake_sb):
        """Backups older than 12-week retention period should be deleted."""
        with patch("api.routes.backup.CRON_SECRET", "test-secret"), \
             patch("api.routes.backup._send_notification"):
            _setup_empty_tables(fake_sb)
            fake_sb.auth.admin.list_users.return_value = []

            old_files = [
                {"name": f"2026-01-{i:02d}_backup.json"}
                for i in range(1, 15)  # 14 files > 12 retention
            ]
            backup_bucket, _ = _setup_storage_mock(fake_sb, backup_files=old_files)

            response = client.post(
                "/api/backup/cron",
                headers={"Authorization": "Bearer test-secret"},
            )

            assert response.status_code == 200
            assert response.json()["old_backups_deleted"] == 2

            backup_bucket.remove.assert_called_once()
            deleted_paths = backup_bucket.remove.call_args[0][0]
            assert len(deleted_paths) == 2
            assert "2026-01-01_backup.json" in deleted_paths
            assert "2026-01-02_backup.json" in deleted_paths

    def test_upload_failure_returns_500_and_notifies(self, client, fake_sb):
        """If Storage upload fails, endpoint returns 500 and sends failure notification."""
        with patch("api.routes.backup.CRON_SECRET", "test-secret"), \
             patch("api.routes.backup._send_notification") as mock_notify:
            _setup_empty_tables(fake_sb)
            fake_sb.auth.admin.list_users.return_value = []

            backup_bucket, _ = _setup_storage_mock(fake_sb)
            backup_bucket.upload.side_effect = Exception("Storage unavailable")

            response = client.post(
                "/api/backup/cron",
                headers={"Authorization": "Bearer test-secret"},
            )

            assert response.status_code == 500
            assert "upload failed" in response.json()["detail"].lower()

            # Failure notification sent
            mock_notify.assert_called_once()
            call_args = mock_notify.call_args
            assert "NIEUDANY" in call_args[1]["subject"] or "NIEUDANY" in call_args[0][0]

    def test_success_sends_notification(self, client, fake_sb):
        """Successful backup sends OK notification email."""
        with patch("api.routes.backup.CRON_SECRET", "test-secret"), \
             patch("api.routes.backup._send_notification") as mock_notify:
            _setup_empty_tables(fake_sb)
            fake_sb.auth.admin.list_users.return_value = []
            _setup_storage_mock(fake_sb)

            response = client.post(
                "/api/backup/cron",
                headers={"Authorization": "Bearer test-secret"},
            )

            assert response.status_code == 200
            mock_notify.assert_called_once()
            call_args = mock_notify.call_args
            assert "OK" in call_args[1]["subject"] or "OK" in call_args[0][0]

    def test_documents_included_in_backup(self, client, fake_sb):
        """PDF files from documents bucket should be exported as base64."""
        with patch("api.routes.backup.CRON_SECRET", "test-secret"), \
             patch("api.routes.backup._send_notification"):
            _setup_empty_tables(fake_sb)
            fake_sb.auth.admin.list_users.return_value = []

            backup_bucket, doc_bucket = _setup_storage_mock(
                fake_sb,
                doc_files=[
                    {"name": "regulamin.pdf"},
                    {"name": "statut.pdf"},
                ],
            )

            response = client.post(
                "/api/backup/cron",
                headers={"Authorization": "Bearer test-secret"},
            )

            assert response.status_code == 200
            assert response.json()["documents_exported"] == 2
            assert doc_bucket.download.call_count == 2


class TestSendNotification:
    def test_notification_sends_to_all_admins(self, fake_sb):
        """Notification should be sent to every active admin."""
        from api.routes.backup import _send_notification

        fake_sb.set_table_data("residents", [
            {"email": "admin1@gabi.pl", "role": "admin", "is_active": True},
            {"email": "admin2@gabi.pl", "role": "admin", "is_active": True},
        ])

        with patch("api.routes.backup.get_supabase", return_value=fake_sb), \
             patch("api.routes.backup.SUPABASE_URL", "https://test.supabase.co"), \
             patch.dict("os.environ", {"SUPABASE_ANON_KEY": "test-anon-key"}), \
             patch("api.routes.backup.httpx.post") as mock_post:
            _send_notification(subject="Test", body="Test body")

            assert mock_post.call_count == 2
            emails_sent = [call.kwargs["json"]["to"] for call in mock_post.call_args_list]
            assert "admin1@gabi.pl" in emails_sent
            assert "admin2@gabi.pl" in emails_sent

    def test_notification_skips_when_no_admins(self, fake_sb):
        """No error when there are no admins to notify."""
        from api.routes.backup import _send_notification

        fake_sb.set_table_data("residents", [])

        with patch("api.routes.backup.get_supabase", return_value=fake_sb), \
             patch("api.routes.backup.httpx.post") as mock_post:
            _send_notification(subject="Test", body="Test body")

            mock_post.assert_not_called()
