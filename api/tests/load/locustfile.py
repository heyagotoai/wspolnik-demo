"""
Testy obciążeniowe WM Gabi — symulacja wielu mieszkańców jednocześnie.

WYMAGANIA
    pip install locust

URUCHOMIENIE (UI Locust na http://localhost:8089)
    # 1. Uruchom serwer FastAPI lokalnie
    cd api && uvicorn index:app --reload

    # 2. Uruchom Locust
    cd api && locust -f tests/load/locustfile.py --host http://localhost:8000

TRYB HEADLESS (bez przeglądarki)
    locust -f tests/load/locustfile.py --host http://localhost:8000 \\
        --headless -u 20 -r 5 --run-time 60s

    Parametry:
        -u  liczba wirtualnych użytkowników (łącznie)
        -r  spawn rate — użytkowników na sekundę
        --run-time  czas trwania testu

KONFIGURACJA
    Ustaw zmienne środowiskowe (lub dodaj do .env):

        LOAD_TEST_ADMIN_TOKEN       Bearer token admina (z Supabase Auth)
        LOAD_TEST_RESIDENT_TOKEN    Bearer token mieszkańca
        LOAD_TEST_RESOLUTION_ID     UUID uchwały w statusie "voting"

    Tokeny uzyskasz przez:
        POST https://<project>.supabase.co/auth/v1/token?grant_type=password
        Body: {"email": "...", "password": "..."}
        Odpowiedź: {"access_token": "...", ...}

SCENARIUSZE
    ResidentUser (waga 10) — przeglądanie panelu + głosowanie
        - GET  /api/resolutions          (priorytet 4)
        - GET  /api/profile              (priorytet 3)
        - GET  /api/resolutions/:id/results  (priorytet 2)
        - GET  /api/resolutions/:id/my-vote  (priorytet 1)
        - POST /api/resolutions/:id/vote     (priorytet 2) — 201 lub 409 = sukces

    AdminUser (waga 1) — operacje admina pod obciążeniem
        - GET  /api/residents            (priorytet 3)
        - GET  /api/audit                (priorytet 3)
        - GET  /api/charges/rates        (priorytet 2)
        - GET  /api/health               (priorytet 1)

INTERPRETACJA WYNIKÓW
    Kluczowe metryki (Locust UI / CSV):
        - RPS (Requests/s)          — przepustowość
        - 50%/95%/99% latency       — czas odpowiedzi w percentylach
        - Failure rate              — odsetek błędów (cel: 0% poza 409)

    Oczekiwane kody odpowiedzi:
        200  — sukces (GET)
        201  — głos oddany po raz pierwszy
        409  — głos już oddany (traktowane jako sukces w teście)
        401  — brak tokenu (problem konfiguracyjny)
        403  — zły token lub rola (problem konfiguracyjny)
"""

import os

from dotenv import load_dotenv
from locust import HttpUser, between, task

load_dotenv()

ADMIN_TOKEN = os.getenv("LOAD_TEST_ADMIN_TOKEN", "")
RESIDENT_TOKEN = os.getenv("LOAD_TEST_RESIDENT_TOKEN", "")
RESOLUTION_ID = os.getenv("LOAD_TEST_RESOLUTION_ID", "")


class ResidentUser(HttpUser):
    """Symulacja mieszkańca — przeglądanie panelu i głosowanie.

    Proporcja: 10 mieszkańców na 1 admina (weight=10).
    """

    weight = 10
    wait_time = between(1, 3)

    def on_start(self):
        self.auth = {"Authorization": f"Bearer {RESIDENT_TOKEN}"}

    # ── Odczyt (read-heavy) ───────────────────────────────────

    @task(4)
    def browse_resolutions(self):
        self.client.get(
            "/api/resolutions",
            headers=self.auth,
            name="/api/resolutions [GET]",
        )

    @task(3)
    def get_profile(self):
        self.client.get(
            "/api/profile",
            headers=self.auth,
            name="/api/profile [GET]",
        )

    @task(2)
    def get_vote_results(self):
        if not RESOLUTION_ID:
            return
        self.client.get(
            f"/api/resolutions/{RESOLUTION_ID}/results",
            headers=self.auth,
            name="/api/resolutions/:id/results [GET]",
        )

    @task(1)
    def get_my_vote(self):
        if not RESOLUTION_ID:
            return
        self.client.get(
            f"/api/resolutions/{RESOLUTION_ID}/my-vote",
            headers=self.auth,
            name="/api/resolutions/:id/my-vote [GET]",
        )

    # ── Głosowanie (write + unique constraint) ────────────────

    @task(2)
    def cast_vote(self):
        """Oddanie głosu — 201 (sukces) lub 409 (już głosował) = OK."""
        if not RESOLUTION_ID:
            return
        with self.client.post(
            f"/api/resolutions/{RESOLUTION_ID}/vote",
            json={"vote": "za"},
            headers=self.auth,
            name="/api/resolutions/:id/vote [POST]",
            catch_response=True,
        ) as resp:
            if resp.status_code in (201, 409):
                resp.success()
            else:
                resp.failure(
                    f"Nieoczekiwany status {resp.status_code}: {resp.text[:200]}"
                )


class AdminUser(HttpUser):
    """Symulacja admina — operacje administracyjne pod obciążeniem.

    Proporcja: 1 admin na 10 mieszkańców (weight=1).
    """

    weight = 1
    wait_time = between(3, 8)

    def on_start(self):
        self.auth = {"Authorization": f"Bearer {ADMIN_TOKEN}"}

    @task(3)
    def list_residents(self):
        self.client.get(
            "/api/residents",
            headers=self.auth,
            name="/api/residents [GET]",
        )

    @task(3)
    def get_audit_log(self):
        self.client.get(
            "/api/audit",
            headers=self.auth,
            name="/api/audit [GET]",
        )

    @task(2)
    def list_charge_rates(self):
        self.client.get(
            "/api/charges/rates",
            headers=self.auth,
            name="/api/charges/rates [GET]",
        )

    @task(1)
    def health_check(self):
        self.client.get(
            "/api/health",
            name="/api/health [GET]",
        )
