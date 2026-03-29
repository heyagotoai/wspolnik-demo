"""Testy scenariuszy współbieżnych i wyścigów (race conditions).

Pokryte scenariusze:
- POST /api/resolutions/:id/vote — wyjątek unique constraint (23505) → 409, nie 500
- POST /api/resolutions/:id/vote — nieoczekiwany wyjątek DB → 500
- POST /api/resolutions/:id/vote — insert zwraca puste data → 500

Uwaga: testy używają FakeSupabase i testują ścieżki kodu odpowiadające
za obsługę błędów bazy danych podczas współbieżnego głosowania.
Faktyczny test race condition na żywej bazie → patrz api/tests/load/locustfile.py.
"""

RESOLUTION_DATA = {
    "id": "res-1",
    "title": "Wymiana windy",
    "status": "voting",
    "created_at": "2026-03-20T10:00:00",
}

RESIDENT_FOR_VOTE = {"id": "res-1", "role": "resident", "is_active": True}


def _patch_votes_insert_to_raise(fake_sb, exception_message: str):
    """Zwraca kontekst w którym insert do tabeli votes rzuca wyjątek.

    Śledzi wywołania table("votes"): pierwsze (select – sprawdzenie duplikatu)
    przechodzi normalnie, drugie (insert) rzuca podany wyjątek.
    """
    original_table = fake_sb.table
    call_count = {"n": 0}

    def patched_table(name):
        builder = original_table(name)
        if name == "votes":
            call_count["n"] += 1
            if call_count["n"] >= 2:
                def raising_execute():
                    raise Exception(exception_message)
                builder.execute = raising_execute
        return builder

    return patched_table


# ── Wyścig: unique constraint ────────────────────────────────────────────────

class TestVotingRaceCondition:
    def test_unique_constraint_zwraca_409_nie_500(self, resident_client, fake_sb):
        """Wyjątek unique constraint (23505) podczas insertu → 409, nie 500.

        Scenariusz: dwie kopie żądania trafiają do serwera równocześnie.
        Pierwsza przechodzi check duplikatu (brak głosu), obie próbują insert.
        PostgreSQL wyrzuca 23505 dla drugiej kopii — endpoint musi zwrócić 409.
        """
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("residents", [RESIDENT_FOR_VOTE])
        fake_sb.set_table_data("votes", [])

        fake_sb.table = _patch_votes_insert_to_raise(
            fake_sb,
            "duplicate key value violates unique constraint (23505)",
        )

        response = resident_client.post(
            "/api/resolutions/res-1/vote", json={"vote": "za"}
        )

        assert response.status_code == 409
        assert "Już oddałeś głos" in response.json()["detail"]

    def test_unique_keyword_w_bledzie_zwraca_409(self, resident_client, fake_sb):
        """Wyjątek zawierający słowo 'unique' (bez kodu 23505) → też 409."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("residents", [RESIDENT_FOR_VOTE])
        fake_sb.set_table_data("votes", [])

        fake_sb.table = _patch_votes_insert_to_raise(
            fake_sb,
            "unique constraint violation on votes_resident_resolution",
        )

        response = resident_client.post(
            "/api/resolutions/res-1/vote", json={"vote": "za"}
        )

        assert response.status_code == 409

    def test_nieoczekiwany_wyjatek_db_zwraca_500(self, resident_client, fake_sb):
        """Nieoczekiwany wyjątek DB podczas insertu → 500 (nie 409, nie crash)."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("residents", [RESIDENT_FOR_VOTE])
        fake_sb.set_table_data("votes", [])

        fake_sb.table = _patch_votes_insert_to_raise(
            fake_sb,
            "connection timeout: could not reach database",
        )

        response = resident_client.post(
            "/api/resolutions/res-1/vote", json={"vote": "za"}
        )

        assert response.status_code == 500
        assert "Nie udało się zapisać głosu" in response.json()["detail"]

    def test_pusty_wynik_insertu_zwraca_500(self, resident_client, fake_sb):
        """Insert zwraca puste data (bez wyjątku) → 500."""
        fake_sb.set_table_data("resolutions", [RESOLUTION_DATA])
        fake_sb.set_table_data("residents", [RESIDENT_FOR_VOTE])
        fake_sb.set_table_data("votes", [])
        # Domyślnie insert do pustej tabeli zwraca [] gdy pre-set data jest []
        # i insert() nie nadpisuje (bo _data = [] → insert ustawia _data = [dane])
        # Wymuszamy pusty wynik: pre-set data NIE jest [] i nie zmodyfikujemy,
        # ale insert() zastępuje tylko gdy _data jest puste.
        # Najprostsze: nie ustawiamy pre-set data → builder._data = []
        # i insert() ustawi _data = [{"resolution_id": ...}], execute() zwróci listę
        # Żeby dostać puste data musimy nadpisać execute.
        original_table = fake_sb.table
        call_count = {"n": 0}

        def patched_table(name):
            builder = original_table(name)
            if name == "votes":
                call_count["n"] += 1
                if call_count["n"] >= 2:
                    def empty_execute():
                        from types import SimpleNamespace
                        return SimpleNamespace(data=[], error=None, count=None)
                    builder.execute = empty_execute
            return builder

        fake_sb.table = patched_table

        response = resident_client.post(
            "/api/resolutions/res-1/vote", json={"vote": "za"}
        )

        assert response.status_code == 500
        assert "Nie udało się zapisać głosu" in response.json()["detail"]
