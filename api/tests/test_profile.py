"""Tests for profile endpoints (GET/PATCH /profile, POST /profile/change-password)."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api.core.config import CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION
from api.core.security import get_current_user

_PROFILE_BASE = {
    "id": "res-1",
    "email": "jan@gabi.pl",
    "full_name": "Jan Kowalski",
    "apartment_number": "12A",
    "role": "resident",
    "is_active": True,
    "created_at": "2026-01-15T10:00:00Z",
}

PROFILE_DATA = {
    **_PROFILE_BASE,
    "privacy_accepted_at": "2026-01-20T10:00:00Z",
    "terms_accepted_at": "2026-01-20T10:00:00Z",
    "privacy_version": CURRENT_PRIVACY_VERSION,
    "terms_version": CURRENT_TERMS_VERSION,
}


def test_get_profile(fake_sb, resident_client):
    fake_sb.set_table_data("residents", [PROFILE_DATA])
    r = resident_client.get("/api/profile")
    assert r.status_code == 200
    data = r.json()
    assert data["full_name"] == "Jan Kowalski"
    assert data["email"] == "jan@gabi.pl"
    assert data["apartment_number"] == "12A"
    assert data.get("can_vote_resolutions") is True
    assert data.get("needs_legal_acceptance") is False
    assert data.get("current_privacy_version") == CURRENT_PRIVACY_VERSION


def test_get_profile_needs_legal_when_missing(fake_sb, resident_client):
    fake_sb.set_table_data("residents", [_PROFILE_BASE])
    r = resident_client.get("/api/profile")
    assert r.status_code == 200
    assert r.json().get("needs_legal_acceptance") is True


def test_get_profile_needs_legal_when_version_stale(fake_sb, resident_client):
    fake_sb.set_table_data("residents", [{
        **_PROFILE_BASE,
        "privacy_accepted_at": "2026-01-20T10:00:00Z",
        "terms_accepted_at": "2026-01-20T10:00:00Z",
        "privacy_version": "2020-01-01",
        "terms_version": "2020-01-01",
    }])
    r = resident_client.get("/api/profile")
    assert r.status_code == 200
    assert r.json().get("needs_legal_acceptance") is True


def test_post_legal_consent_success(fake_sb, resident_client):
    fake_sb.set_table_data("residents", [_PROFILE_BASE])
    r = resident_client.post("/api/profile/legal-consent", json={
        "accept_privacy": True,
        "accept_terms": True,
    })
    assert r.status_code == 200
    data = r.json()
    assert data.get("needs_legal_acceptance") is False
    assert data.get("privacy_version") == CURRENT_PRIVACY_VERSION
    assert data.get("terms_version") == CURRENT_TERMS_VERSION
    assert data.get("privacy_accepted_at")
    assert data.get("terms_accepted_at")


def test_post_legal_consent_requires_both(fake_sb, resident_client):
    fake_sb.set_table_data("residents", [_PROFILE_BASE])
    r = resident_client.post("/api/profile/legal-consent", json={
        "accept_privacy": True,
        "accept_terms": False,
    })
    assert r.status_code == 400
    assert "wymagana" in r.json()["detail"].lower()


def test_post_legal_consent_requires_auth(fake_sb, client):
    fake_sb.set_table_data("residents", [_PROFILE_BASE])
    r = client.post("/api/profile/legal-consent", json={
        "accept_privacy": True,
        "accept_terms": True,
    })
    assert r.status_code == 401


def test_get_profile_admin_bez_lokalu_can_vote_false(fake_sb, app):
    """Admin bez przypisanego lokalu jako właściciel — nie głosuje w uchwałach."""
    fake_sb.set_table_data("residents", [{
        "id": "admin-1",
        "email": "admin@gabi.pl",
        "full_name": "Admin",
        "apartment_number": None,
        "role": "admin",
        "is_active": True,
        "created_at": "2026-01-15T10:00:00Z",
        "privacy_accepted_at": "2026-01-20T10:00:00Z",
        "terms_accepted_at": "2026-01-20T10:00:00Z",
        "privacy_version": CURRENT_PRIVACY_VERSION,
        "terms_version": CURRENT_TERMS_VERSION,
    }])
    fake_sb.set_table_data("apartments", [])

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "admin-1",
        "email": "admin@gabi.pl",
    }
    try:
        r = TestClient(app).get("/api/profile")
        assert r.status_code == 200
        assert r.json().get("can_vote_resolutions") is False
    finally:
        app.dependency_overrides.clear()


def test_get_profile_admin_z_lokalem_can_vote_true(fake_sb, app):
    fake_sb.set_table_data("residents", [{
        "id": "admin-1",
        "email": "admin@gabi.pl",
        "full_name": "Admin",
        "apartment_number": None,
        "role": "admin",
        "is_active": True,
        "created_at": "2026-01-15T10:00:00Z",
        "privacy_accepted_at": "2026-01-20T10:00:00Z",
        "terms_accepted_at": "2026-01-20T10:00:00Z",
        "privacy_version": CURRENT_PRIVACY_VERSION,
        "terms_version": CURRENT_TERMS_VERSION,
    }])
    fake_sb.set_table_data("apartments", [
        {"id": "apt-1", "owner_resident_id": "admin-1", "share": 0.1},
    ])

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "admin-1",
        "email": "admin@gabi.pl",
    }
    try:
        r = TestClient(app).get("/api/profile")
        assert r.status_code == 200
        assert r.json().get("can_vote_resolutions") is True
    finally:
        app.dependency_overrides.clear()


def test_get_profile_not_found(fake_sb, resident_client):
    fake_sb.set_table_data("residents", [])
    r = resident_client.get("/api/profile")
    assert r.status_code == 404


def test_get_profile_requires_auth(fake_sb, client):
    r = client.get("/api/profile")
    assert r.status_code == 401


def test_update_profile_name(fake_sb, resident_client):
    updated = {**PROFILE_DATA, "full_name": "Jan Nowak"}
    fake_sb.set_table_data("residents", [updated])
    r = resident_client.patch("/api/profile", json={"full_name": "Jan Nowak"})
    assert r.status_code == 200
    assert r.json()["full_name"] == "Jan Nowak"


def test_update_profile_empty_name(fake_sb, resident_client):
    r = resident_client.patch("/api/profile", json={"full_name": "  "})
    assert r.status_code == 422  # Pydantic validation


def test_change_password_success(fake_sb, resident_client):
    tmp_sb = MagicMock()
    tmp_sb.auth.sign_in_with_password.return_value = True
    fake_sb.auth.admin.update_user_by_id.return_value = True
    with patch("api.routes.profile.create_client", return_value=tmp_sb):
        r = resident_client.post("/api/profile/change-password", json={
            "current_password": "old123",
            "new_password": "new123",
        })
    assert r.status_code == 200
    assert "zmienione" in r.json()["detail"].lower()
    tmp_sb.auth.sign_in_with_password.assert_called_once()
    fake_sb.auth.admin.update_user_by_id.assert_called_once()


def test_change_password_wrong_current(fake_sb, resident_client):
    tmp_sb = MagicMock()
    tmp_sb.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")
    with patch("api.routes.profile.create_client", return_value=tmp_sb):
        r = resident_client.post("/api/profile/change-password", json={
            "current_password": "wrong",
            "new_password": "new123",
        })
    assert r.status_code == 400
    assert "nieprawidłowe" in r.json()["detail"].lower()


def test_change_password_too_short(fake_sb, resident_client):
    r = resident_client.post("/api/profile/change-password", json={
        "current_password": "old123",
        "new_password": "ab",
    })
    assert r.status_code == 422  # Pydantic validation (min_length=6)
