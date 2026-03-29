"""Tests for profile endpoints (GET/PATCH /profile, POST /profile/change-password)."""

from fastapi.testclient import TestClient

from api.core.security import get_current_user

PROFILE_DATA = {
    "id": "res-1",
    "email": "jan@gabi.pl",
    "full_name": "Jan Kowalski",
    "apartment_number": "12A",
    "role": "resident",
    "is_active": True,
    "created_at": "2026-01-15T10:00:00Z",
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
    fake_sb.auth.sign_in_with_password.return_value = True
    fake_sb.auth.admin.update_user_by_id.return_value = True
    r = resident_client.post("/api/profile/change-password", json={
        "current_password": "old123",
        "new_password": "new123",
    })
    assert r.status_code == 200
    assert "zmienione" in r.json()["detail"].lower()
    fake_sb.auth.sign_in_with_password.assert_called_once()
    fake_sb.auth.admin.update_user_by_id.assert_called_once()


def test_change_password_wrong_current(fake_sb, resident_client):
    fake_sb.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")
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
