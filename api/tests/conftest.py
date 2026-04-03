"""Shared fixtures for API tests.

Patches get_supabase where it's imported (security + routes),
so all Supabase calls go through FakeSupabase.
"""

import copy
import os

# Zanim załaduje się api.core.config (wymaga kluczy), ustaw placeholdery.
# Dzięki temu `pytest` bez pliku .env oraz CI z pełnym `env:` w workflow
# nie kończą się masowym KeyError. Wartości z środowiska (GitHub, Vercel, .env) mają pierwszeństwo.
os.environ.setdefault("SUPABASE_URL", "https://placeholder.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "placeholder")

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# --- Fake Supabase helpers ---------------------------------------------------

class FakeSupabaseBuilder:
    """Chainable query builder that returns preconfigured data."""

    def __init__(self, data=None, error=None, parent=None, table_name: str | None = None):
        self._data = data if data is not None else []
        self._error = error
        self._is_single = False
        self._count = None
        self._parent = parent
        self._table_name = table_name
        self._update_patch: dict | None = None
        self._eq_filters: list[tuple[str, object]] = []

    def select(self, *_a, **kw):
        if kw.get("count") == "exact":
            self._count = len(self._data)
        return self

    def insert(self, data):
        # Keep pre-set data (from set_table_data) so response validates.
        # Only use inserted data if no pre-set data exists.
        if isinstance(data, dict) and not self._data:
            row = dict(data)
            # Głosy (POST /resolutions/:id/vote) — VoteOut wymaga id i voted_at
            if "vote" in row and "resolution_id" in row:
                row.setdefault("id", "vote-gen-1")
                row.setdefault("voted_at", "2026-03-21T12:00:00Z")
            self._data = [row]
        return self

    def upsert(self, data):
        if isinstance(data, dict) and not self._data:
            self._data = [data]
        return self

    def update(self, data):
        self._update_patch = dict(data) if data else {}
        return self

    def limit(self, _n):
        return self

    def delete(self):
        return self

    def eq(self, col, val):
        self._eq_filters.append((col, val))
        return self

    def in_(self, *_a, **_kw):
        return self

    def is_(self, *_a, **_kw):
        return self

    def order(self, *_a, **_kw):
        return self

    def single(self):
        """Mark this query as single-row (returns dict, not list)."""
        self._is_single = True
        return self

    def maybe_single(self):
        """Like single(), but returns None instead of error when no data."""
        self._is_single = True
        return self

    def gte(self, *_a, **_kw):
        return self

    def lte(self, *_a, **_kw):
        return self

    def range(self, *_a, **_kw):
        return self

    def execute(self):
        if self._update_patch is not None and self._parent and self._table_name:
            rows = self._parent._tables.get(self._table_name, [])
            matched = None
            for row in rows:
                if all(row.get(k) == v for k, v in self._eq_filters):
                    row.update(self._update_patch)
                    matched = row
                    break
            self._data = [dict(matched)] if matched is not None else []
            self._update_patch = None
            self._eq_filters = []

        data = self._data
        if self._is_single and isinstance(data, list):
            data = data[0] if data else None
        count = self._count
        # Reset per-query flags
        self._is_single = False
        self._count = None
        return SimpleNamespace(data=data, error=self._error, count=count)


class FakeSupabase:
    """Minimal Supabase mock supporting auth + table operations."""

    def __init__(self):
        self.auth = MagicMock()
        self._tables: dict[str, list] = {}

    def table(self, name: str):
        """Return a fresh builder with the stored data for this table."""
        data = self._tables.get(name, [])
        return FakeSupabaseBuilder(data=list(data), parent=self, table_name=name)

    def set_table_data(self, name: str, data: list | None = None, error=None):
        raw = data if data is not None else []
        # Głęboka kopia — update() w teście mutuje wiersze; bez tego kolejne testy widzą zmiany.
        self._tables[name] = [
            copy.deepcopy(row) if isinstance(row, dict) else row for row in raw
        ]


# --- Fixtures ----------------------------------------------------------------

@pytest.fixture()
def fake_sb():
    """Create a FakeSupabase and patch get_supabase everywhere it's imported."""
    sb = FakeSupabase()
    with patch("api.core.security.get_supabase", return_value=sb), \
         patch("api.routes.residents.get_supabase", return_value=sb), \
         patch("api.routes.resolutions.get_supabase", return_value=sb), \
         patch("api.routes.profile.get_supabase", return_value=sb), \
         patch("api.routes.announcements.get_supabase", return_value=sb), \
         patch("api.routes.charges.get_supabase", return_value=sb), \
         patch("api.routes.contact.get_supabase", return_value=sb), \
         patch("api.routes.audit.get_supabase", return_value=sb), \
         patch("api.routes.backup.get_supabase", return_value=sb), \
         patch("api.routes.billing_groups.get_supabase", return_value=sb), \
         patch("api.routes.import_routes.get_supabase", return_value=sb):
        yield sb


@pytest.fixture()
def app():
    """Return the FastAPI app instance."""
    from api.index import app as _app
    yield _app
    _app.dependency_overrides.clear()


@pytest.fixture()
def client(fake_sb, app):
    """Return a TestClient with mocked Supabase (full auth flow)."""
    return TestClient(app)


@pytest.fixture()
def admin_client(fake_sb, app):
    """Return a TestClient where require_admin and require_admin_or_manager are overridden."""
    from api.core.security import require_admin, require_admin_or_manager

    app.dependency_overrides[require_admin] = lambda: {
        "sub": "admin-1", "email": "admin@gabi.pl", "role": "admin",
    }
    app.dependency_overrides[require_admin_or_manager] = lambda: {
        "sub": "admin-1", "email": "admin@gabi.pl", "role": "admin",
    }
    return TestClient(app)


@pytest.fixture()
def manager_client(fake_sb, app):
    """Return a TestClient where require_admin_or_manager is overridden with manager role."""
    from api.core.security import require_admin_or_manager

    app.dependency_overrides[require_admin_or_manager] = lambda: {
        "sub": "manager-1", "email": "manager@gabi.pl", "role": "manager",
    }
    return TestClient(app)


@pytest.fixture()
def admin_headers(fake_sb):
    """Configure fake_sb for full auth flow as admin.

    Use with `client` fixture when testing auth behavior.
    """
    fake_sb.auth.get_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="admin-1", email="admin@gabi.pl"),
    )
    fake_sb.set_table_data("residents", [{"role": "admin"}])
    return {"Authorization": "Bearer fake-admin-token"}


@pytest.fixture()
def resident_headers(fake_sb):
    """Configure fake_sb for full auth flow as resident."""
    fake_sb.auth.get_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="res-1", email="jan@gabi.pl"),
    )
    fake_sb.set_table_data("residents", [{"role": "resident"}])
    return {"Authorization": "Bearer fake-resident-token"}


@pytest.fixture()
def resident_client(fake_sb, app):
    """Return a TestClient where get_current_user is overridden to a resident."""
    from api.core.security import get_current_user

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "res-1", "email": "jan@gabi.pl",
    }
    return TestClient(app)
