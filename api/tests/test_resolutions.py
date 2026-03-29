"""Testy endpointów /api/resolutions.

Pokryte scenariusze:
- GET    /api/resolutions              — lista uchwał
- POST   /api/resolutions              — tworzenie uchwały (admin)
- PATCH  /api/resolutions/:id          — aktualizacja (admin)
- DELETE /api/resolutions/:id          — usuwanie (admin)
- GET    /api/resolutions/:id/results  — wyniki głosowania
- GET    /api/resolutions/:id/votes    — lista głosów z danymi mieszkańców (admin)
- DELETE /api/resolutions/:id/votes    — reset głosów (admin)
- GET    /api/resolutions/:id/my-vote  — mój głos
- POST   /api/resolutions/:id/vote     — oddanie głosu
"""

import pytest

RESOLUTION_DATA = {
    "id": "res-1",
    "title": "Wymiana windy",
    "description": "Głosowanie nad wymianą windy",
    "document_id": None,
    "voting_start": "2026-04-01",
    "voting_end": "2026-04-15",
    "status": "voting",
    "created_at": "2026-03-20T10:00:00",
}

VOTE_DATA = {
    "id": "vote-1",
    "resolution_id": "res-1",
    "resident_id": "res-1",
    "vote": "za",
    "voted_at": "2026-03-21T12:00:00",
}

RESIDENT_DATA = {
    "id": "res-1",
    "full_name": "Jan Kowalski",
    "apartment_number": "12",
    "role": "resident",
}

# Wymagane przy POST /vote — endpoint sprawdza rolę i is_active
RESIDENT_FOR_VOTE = {
    "id": "res-1",
    "role": "resident",
    "is_active": True,
}


# --- GET /api/resolutions ---------------------------------------------------

class TestListResolutions:
    def test_lista_uchwal(self, resident_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])

        response = resident_client.get("/api/resolutions")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Wymiana windy"

    def test_lista_niedostepna_bez_logowania(self, client):
        response = client.get("/api/resolutions")
        assert response.status_code == 401


# --- POST /api/resolutions --------------------------------------------------

class TestCreateResolution:
    def test_tworzenie_uchwaly(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])

        response = admin_client.post("/api/resolutions", json={
            "title": "Wymiana windy",
            "description": "Głosowanie nad wymianą windy",
            "status": "draft",
        })
        assert response.status_code == 201
        assert response.json()["title"] == "Wymiana windy"

    def test_tworzenie_ze_statusem_voting_tworzy_ogloszenie(self, admin_client, fake_sb):
        """Creating a resolution with status 'voting' auto-creates an announcement."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("announcements", [])

        response = admin_client.post("/api/resolutions", json={
            "title": "Nowa uchwała",
            "status": "voting",
        })
        assert response.status_code == 201

    def test_tworzenie_wymaga_admina(self, resident_client, fake_sb):
        """Resident (non-admin) cannot create resolutions."""
        # resident_client only overrides get_current_user, not require_admin
        # so the require_admin dep will fail because the role check won't pass
        response = resident_client.post("/api/resolutions", json={
            "title": "Test",
        })
        assert response.status_code == 403


# --- PATCH /api/resolutions/:id ---------------------------------------------

class TestUpdateResolution:
    def test_aktualizacja_uchwaly(self, admin_client, fake_sb):
        updated = {**RESOLUTION_DATA, "status": "closed"}
        fake_sb.set_table_data("resolutions", [updated])

        response = admin_client.patch("/api/resolutions/res-1", json={
            "status": "closed",
        })
        assert response.status_code == 200
        assert response.json()["status"] == "closed"

    def test_aktualizacja_puste_dane(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        response = admin_client.patch("/api/resolutions/res-1", json={})
        assert response.status_code == 400

    def test_cofniecie_do_draft_usuwa_glosy(self, admin_client, fake_sb):
        """Resetting to draft deletes all votes for the resolution."""
        voting_res = {**RESOLUTION_DATA, "status": "voting"}
        draft_res = {**RESOLUTION_DATA, "status": "draft"}
        fake_sb.set_table_data("resolutions", [voting_res])
        fake_sb.set_table_data("votes", [VOTE_DATA])

        from unittest.mock import patch as _patch
        call_count = {"n": 0}
        original_table = fake_sb.table

        def table_returning_draft(name):
            builder = original_table(name)
            if name == "resolutions":
                call_count["n"] += 1
                if call_count["n"] >= 2:
                    builder._data = [draft_res]
            return builder

        with _patch.object(fake_sb, "table", side_effect=table_returning_draft):
            response = admin_client.patch("/api/resolutions/res-1", json={"status": "draft"})

        assert response.status_code == 200
        assert response.json()["status"] == "draft"

    def test_zmiana_na_voting_tworzy_ogloszenie(self, admin_client, fake_sb):
        """Changing status to 'voting' auto-creates an announcement."""
        draft = {**RESOLUTION_DATA, "status": "draft"}
        voting = {**RESOLUTION_DATA, "status": "voting"}
        # First select returns draft (old status), update returns voting
        fake_sb.set_table_data("resolutions", [draft])
        fake_sb.set_table_data("announcements", [])

        # FakeSupabase returns same data for all queries on a table,
        # so we patch to return draft first, then voting for update
        from unittest.mock import patch as _patch
        call_count = {"n": 0}
        original_table = fake_sb.table

        def table_with_status_change(name):
            builder = original_table(name)
            if name == "resolutions":
                call_count["n"] += 1
                # Second call is the update — return voting status
                if call_count["n"] >= 2:
                    builder._data = [voting]
            return builder

        with _patch.object(fake_sb, "table", side_effect=table_with_status_change):
            response = admin_client.patch("/api/resolutions/res-1", json={
                "status": "voting",
            })

        assert response.status_code == 200


# --- DELETE /api/resolutions/:id --------------------------------------------

class TestDeleteResolution:
    def test_usuwanie_uchwaly(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])

        response = admin_client.delete("/api/resolutions/res-1")
        assert response.status_code == 200
        assert "usunięta" in response.json()["detail"]

    def test_usuwanie_nieistniejaca(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [])

        response = admin_client.delete("/api/resolutions/nonexistent")
        assert response.status_code == 404


# --- GET /api/resolutions/:id/results --------------------------------------

class TestVoteResults:
    def test_wyniki_glosowania(self, resident_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("apartments", [
            {"owner_resident_id": "r1", "share": 0.5},
            {"owner_resident_id": "r2", "share": 0.2},
            {"owner_resident_id": "r3", "share": 0.3},
        ])
        fake_sb.set_table_data("votes", [
            {"vote": "za", "resident_id": "r1", "resolution_id": "res-1"},
            {"vote": "za", "resident_id": "r2", "resolution_id": "res-1"},
            {"vote": "przeciw", "resident_id": "r3", "resolution_id": "res-1"},
        ])

        response = resident_client.get("/api/resolutions/res-1/results")
        assert response.status_code == 200
        data = response.json()
        assert data["za"] == 2
        assert data["przeciw"] == 1
        assert data["wstrzymuje"] == 0
        assert data["total"] == 3
        assert data["total_share_community"] == pytest.approx(1.0)
        assert data["share_za"] == pytest.approx(0.7)
        assert data["share_przeciw"] == pytest.approx(0.3)
        assert data["share_wstrzymuje"] == pytest.approx(0.0)


# --- POST /api/resolutions/:id/vote ----------------------------------------

class TestCastVote:
    def test_duplikat_glosu_zwraca_409(self, resident_client, fake_sb):
        """Resident who already voted gets 409."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("residents", [RESIDENT_FOR_VOTE])
        fake_sb.set_table_data("votes", [VOTE_DATA])

        response = resident_client.post("/api/resolutions/res-1/vote", json={
            "vote": "za",
        })
        assert response.status_code == 409

    def test_nieprawidlowy_glos(self, resident_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("residents", [RESIDENT_FOR_VOTE])

        response = resident_client.post("/api/resolutions/res-1/vote", json={
            "vote": "invalid",
        })
        assert response.status_code == 422  # Pydantic Literal validation

    def test_glosowanie_na_nieaktywna_uchwale(self, resident_client, fake_sb):
        closed_resolution = {**RESOLUTION_DATA, "status": "closed"}
        fake_sb.set_table_data("resolutions", [closed_resolution])
        fake_sb.set_table_data("residents", [RESIDENT_FOR_VOTE])

        response = resident_client.post("/api/resolutions/res-1/vote", json={
            "vote": "za",
        })
        assert response.status_code == 400

    def test_admin_nie_moze_glosowac(self, fake_sb, app):
        from fastapi.testclient import TestClient

        from api.core.security import get_current_user

        app.dependency_overrides[get_current_user] = lambda: {
            "sub": "admin-1",
            "email": "admin@gabi.pl",
        }
        try:
            fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
            fake_sb.set_table_data("votes", [])
            fake_sb.set_table_data(
                "residents",
                [{"id": "admin-1", "role": "admin", "is_active": True}],
            )
            fake_sb.set_table_data("apartments", [])
            client = TestClient(app)
            response = client.post("/api/resolutions/res-1/vote", json={"vote": "za"})
            assert response.status_code == 403
            assert "właściciel" in response.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()

    def test_admin_wlasciciel_moze_glosowac(self, fake_sb, app):
        """Administrator będący właścicielem lokalu może głosować."""
        from fastapi.testclient import TestClient

        from api.core.security import get_current_user

        app.dependency_overrides[get_current_user] = lambda: {
            "sub": "admin-1",
            "email": "admin@gabi.pl",
        }
        try:
            fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
            fake_sb.set_table_data("votes", [])
            fake_sb.set_table_data(
                "residents",
                [{"id": "admin-1", "role": "admin", "is_active": True}],
            )
            fake_sb.set_table_data(
                "apartments",
                [{"id": "apt-1", "owner_resident_id": "admin-1", "share": 0.05}],
            )
            client = TestClient(app)
            response = client.post("/api/resolutions/res-1/vote", json={"vote": "za"})
            assert response.status_code == 201
            assert response.json()["vote"] == "za"
        finally:
            app.dependency_overrides.clear()

    def test_zarzadca_nie_moze_glosowac(self, fake_sb, app):
        from fastapi.testclient import TestClient

        from api.core.security import get_current_user

        app.dependency_overrides[get_current_user] = lambda: {
            "sub": "manager-1",
            "email": "manager@gabi.pl",
        }
        try:
            fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
            fake_sb.set_table_data("votes", [])
            fake_sb.set_table_data(
                "residents",
                [{"id": "manager-1", "role": "manager", "is_active": True}],
            )
            fake_sb.set_table_data("apartments", [])
            client = TestClient(app)
            response = client.post("/api/resolutions/res-1/vote", json={"vote": "za"})
            assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()

    def test_nieaktywny_mieszkaniec_nie_moze_glosowac(self, resident_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("votes", [])
        fake_sb.set_table_data(
            "residents",
            [{**RESIDENT_FOR_VOTE, "is_active": False}],
        )

        response = resident_client.post("/api/resolutions/res-1/vote", json={"vote": "za"})
        assert response.status_code == 403
        assert "nieaktywne" in response.json()["detail"].lower()


# --- GET /api/resolutions/:id/votes ----------------------------------------

class TestVoteDetails:
    def test_lista_glosow_z_danymi_mieszkancow(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("votes", [VOTE_DATA])
        fake_sb.set_table_data("residents", [RESIDENT_DATA])

        response = admin_client.get("/api/resolutions/res-1/votes")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["full_name"] == "Jan Kowalski"
        assert data[0]["apartment_number"] == "12"
        assert data[0]["vote"] == "za"

    def test_pusta_lista_gdy_brak_glosow(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("votes", [])

        response = admin_client.get("/api/resolutions/res-1/votes")
        assert response.status_code == 200
        assert response.json() == []

    def test_niedostepne_dla_mieszkanca(self, resident_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])

        response = resident_client.get("/api/resolutions/res-1/votes")
        assert response.status_code == 403

    def test_404_dla_nieistniejacego(self, admin_client, fake_sb):
        fake_sb.set_table_data("resolutions", [])

        response = admin_client.get("/api/resolutions/nonexistent/votes")
        assert response.status_code == 404


# --- DELETE /api/resolutions/:id/votes ------------------------------------

class TestResetVotes:
    def test_reset_glosow_usuwa_wszystkie(self, admin_client, fake_sb):
        """Admin can reset all votes for a resolution."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("votes", [VOTE_DATA, {**VOTE_DATA, "id": "vote-2", "vote": "przeciw"}])

        response = admin_client.delete("/api/resolutions/res-1/votes")
        assert response.status_code == 200
        assert "2" in response.json()["detail"]

    def test_reset_brak_glosow_zwraca_400(self, admin_client, fake_sb):
        """Reset when no votes exist returns 400."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("votes", [])

        response = admin_client.delete("/api/resolutions/res-1/votes")
        assert response.status_code == 400

    def test_reset_nieistniejaca_uchwala(self, admin_client, fake_sb):
        """Reset votes for non-existent resolution returns 404."""
        fake_sb.set_table_data("resolutions", [])

        response = admin_client.delete("/api/resolutions/nonexistent/votes")
        assert response.status_code == 404

    def test_reset_niedostepny_dla_mieszkanca(self, resident_client, fake_sb):
        """Resident cannot reset votes."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])

        response = resident_client.delete("/api/resolutions/res-1/votes")
        assert response.status_code == 403


# --- GET /api/resolutions/:id/my-vote --------------------------------------

class TestMyVote:
    def test_moj_glos_istnieje(self, resident_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("votes", [VOTE_DATA])

        response = resident_client.get("/api/resolutions/res-1/my-vote")
        assert response.status_code == 200
        assert response.json()["vote"] == "za"

    def test_moj_glos_brak(self, resident_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("votes", [])

        response = resident_client.get("/api/resolutions/res-1/my-vote")
        assert response.status_code == 200
        assert response.json() is None
