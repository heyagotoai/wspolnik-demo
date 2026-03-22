"""Testy endpointów /api/resolutions.

Pokryte scenariusze:
- GET    /api/resolutions              — lista uchwał
- POST   /api/resolutions              — tworzenie uchwały (admin)
- PATCH  /api/resolutions/:id          — aktualizacja (admin)
- DELETE /api/resolutions/:id          — usuwanie (admin)
- GET    /api/resolutions/:id/results  — wyniki głosowania
- GET    /api/resolutions/:id/my-vote  — mój głos
- POST   /api/resolutions/:id/vote     — oddanie głosu
"""


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
        response = admin_client.patch("/api/resolutions/res-1", json={})
        assert response.status_code == 400


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
        fake_sb.set_table_data("votes", [
            {"vote": "za"},
            {"vote": "za"},
            {"vote": "przeciw"},
        ])

        response = resident_client.get("/api/resolutions/res-1/results")
        assert response.status_code == 200
        data = response.json()
        assert data["za"] == 2
        assert data["przeciw"] == 1
        assert data["wstrzymuje"] == 0
        assert data["total"] == 3


# --- POST /api/resolutions/:id/vote ----------------------------------------

class TestCastVote:
    def test_duplikat_glosu_zwraca_409(self, resident_client, fake_sb):
        """Resident who already voted gets 409."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("votes", [VOTE_DATA])

        response = resident_client.post("/api/resolutions/res-1/vote", json={
            "vote": "za",
        })
        assert response.status_code == 409

    def test_nieprawidlowy_glos(self, resident_client, fake_sb):
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])

        response = resident_client.post("/api/resolutions/res-1/vote", json={
            "vote": "invalid",
        })
        assert response.status_code == 400

    def test_glosowanie_na_nieaktywna_uchwale(self, resident_client, fake_sb):
        closed_resolution = {**RESOLUTION_DATA, "status": "closed"}
        fake_sb.set_table_data("resolutions", [closed_resolution])

        response = resident_client.post("/api/resolutions/res-1/vote", json={
            "vote": "za",
        })
        assert response.status_code == 400


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
