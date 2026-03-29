"""Tests for announcement mailing endpoint (POST /api/announcements/{id}/send-email)."""

from unittest.mock import patch

ANNOUNCEMENT = {
    "id": "ann-1",
    "title": "Wymiana rur",
    "content": "W dniach 10-12 marca nastąpi wymiana rur.",
    "excerpt": None,
    "is_pinned": False,
    "email_sent_at": None,
    "author_id": "admin-1",
    "created_at": "2026-03-01T10:00:00Z",
    "updated_at": "2026-03-01T10:00:00Z",
}

RESIDENTS = [
    {"email": "jan@gabi.pl", "full_name": "Jan Kowalski"},
    {"email": "anna@gabi.pl", "full_name": "Anna Nowak"},
]


def test_send_email_success(fake_sb, admin_client):
    fake_sb.set_table_data("announcements", [ANNOUNCEMENT])
    fake_sb.set_table_data("residents", RESIDENTS)

    with patch("api.routes.announcements.os.getenv", side_effect=lambda k: {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key",
    }.get(k)), patch("api.routes.announcements._send_one_email", return_value=True) as mock_send:
        r = admin_client.post("/api/announcements/ann-1/send-email")

    assert r.status_code == 200
    assert "2" in r.json()["detail"]  # sent to 2 residents
    assert mock_send.call_count == 2


def test_send_email_already_sent(fake_sb, admin_client):
    sent = {**ANNOUNCEMENT, "email_sent_at": "2026-03-05T10:00:00Z"}
    fake_sb.set_table_data("announcements", [sent])

    r = admin_client.post("/api/announcements/ann-1/send-email")
    assert r.status_code == 400
    assert "już" in r.json()["detail"].lower()


def test_send_email_not_found(fake_sb, admin_client):
    fake_sb.set_table_data("announcements", [])

    r = admin_client.post("/api/announcements/ann-1/send-email")
    assert r.status_code == 404


def test_send_email_no_residents(fake_sb, admin_client):
    fake_sb.set_table_data("announcements", [ANNOUNCEMENT])
    fake_sb.set_table_data("residents", [])

    r = admin_client.post("/api/announcements/ann-1/send-email")
    assert r.status_code == 400
    assert "mieszkańców" in r.json()["detail"].lower()


def test_send_email_requires_auth(fake_sb, client):
    """Unauthenticated request should be rejected."""
    r = client.post("/api/announcements/ann-1/send-email")
    assert r.status_code == 401


def test_send_email_partial_failure(fake_sb, admin_client):
    fake_sb.set_table_data("announcements", [ANNOUNCEMENT])
    fake_sb.set_table_data("residents", RESIDENTS)

    call_count = 0

    def mock_send(*_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        return call_count == 1  # first succeeds, second fails

    with patch("api.routes.announcements.os.getenv", side_effect=lambda k: {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-key",
    }.get(k)), patch("api.routes.announcements._send_one_email", side_effect=mock_send):
        r = admin_client.post("/api/announcements/ann-1/send-email")

    assert r.status_code == 200
    detail = r.json()["detail"]
    assert "1" in detail  # 1 sent
    assert "nie udało" in detail.lower()
