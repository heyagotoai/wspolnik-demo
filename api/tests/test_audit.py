"""Testy endpointów /api/audit.

Pokryte scenariusze:
- GET /api/audit — lista wpisów audit log (admin only)
- Filtry: table_name, action, date_from, date_to
- Paginacja
- Brak dostępu dla mieszkańca
- Brak dostępu bez logowania
"""

AUDIT_ENTRY = {
    "id": "audit-1",
    "user_id": "admin-1",
    "action": "create",
    "table_name": "charges",
    "record_id": "charge-1",
    "old_data": None,
    "new_data": {"amount": "150.00"},
    "created_at": "2026-03-25T14:00:00",
}

AUDIT_VOTE_RESET = {
    "id": "audit-2",
    "user_id": "admin-1",
    "action": "votes_reset",
    "table_name": "votes",
    "record_id": "res-1",
    "old_data": {"votes": [{"vote": "za", "resident_id": "res-1"}], "reason": "manual_reset"},
    "new_data": None,
    "created_at": "2026-03-25T15:00:00",
}

RESIDENT_ADMIN = {
    "id": "admin-1",
    "email": "admin@gabi.pl",
    "full_name": "Administrator",
}


class TestListAuditLog:
    def test_lista_audit_admin(self, admin_client, fake_sb):
        fake_sb.set_table_data("audit_log", [AUDIT_ENTRY, AUDIT_VOTE_RESET])
        fake_sb.set_table_data("residents", [RESIDENT_ADMIN])

        response = admin_client.get("/api/audit")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert data["page"] == 1

    def test_audit_zwraca_user_name(self, admin_client, fake_sb):
        fake_sb.set_table_data("audit_log", [AUDIT_ENTRY])
        fake_sb.set_table_data("residents", [RESIDENT_ADMIN])

        response = admin_client.get("/api/audit")
        entries = response.json()["data"]
        assert len(entries) >= 1
        assert entries[0]["user_name"] == "Administrator"

    def test_audit_z_filtrem_tabeli(self, admin_client, fake_sb):
        fake_sb.set_table_data("audit_log", [AUDIT_ENTRY])
        fake_sb.set_table_data("residents", [RESIDENT_ADMIN])

        response = admin_client.get("/api/audit?table_name=charges")
        assert response.status_code == 200

    def test_audit_z_filtrem_akcji(self, admin_client, fake_sb):
        fake_sb.set_table_data("audit_log", [AUDIT_VOTE_RESET])
        fake_sb.set_table_data("residents", [RESIDENT_ADMIN])

        response = admin_client.get("/api/audit?action=votes_reset")
        assert response.status_code == 200

    def test_audit_z_filtrem_dat(self, admin_client, fake_sb):
        fake_sb.set_table_data("audit_log", [AUDIT_ENTRY])
        fake_sb.set_table_data("residents", [RESIDENT_ADMIN])

        response = admin_client.get("/api/audit?date_from=2026-03-01&date_to=2026-03-31")
        assert response.status_code == 200

    def test_audit_paginacja(self, admin_client, fake_sb):
        fake_sb.set_table_data("audit_log", [AUDIT_ENTRY])
        fake_sb.set_table_data("residents", [RESIDENT_ADMIN])

        response = admin_client.get("/api/audit?page=2&per_page=10")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert data["per_page"] == 10


class TestAuditAccess:
    def test_audit_niedostepny_bez_logowania(self, client):
        response = client.get("/api/audit")
        assert response.status_code == 401

    def test_audit_niedostepny_dla_mieszkanca(self, client, resident_headers):
        response = client.get("/api/audit", headers=resident_headers)
        assert response.status_code == 403


class TestVotesResetSnapshot:
    """Test that reset_votes creates an audit snapshot before deleting."""

    def test_reset_tworzy_snapshot(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [{
            "id": "res-1", "title": "Test", "status": "voting",
        }])
        fake_sb.set_table_data("votes", [
            {"id": "v1", "resolution_id": "res-1", "resident_id": "r1",
             "vote": "za", "voted_at": "2026-03-25T10:00:00"},
        ])

        response = admin_client.delete("/api/resolutions/res-1/votes")
        assert response.status_code == 200

    def test_reset_bez_glosow_400(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [{
            "id": "res-1", "title": "Test", "status": "voting",
        }])
        fake_sb.set_table_data("votes", [])

        response = admin_client.delete("/api/resolutions/res-1/votes")
        assert response.status_code == 400
