"""Shared fixtures for API tests.

Patches get_supabase where it's imported (security + routes),
so all Supabase calls go through FakeSupabase.
"""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# --- Fake Supabase helpers ---------------------------------------------------

class FakeSupabaseBuilder:
    """Chainable query builder that returns preconfigured data."""

    def __init__(self, data=None, error=None):
        self._data = data if data is not None else []
        self._error = error
        self._is_single = False

    def select(self, *_a, **_kw):
        return self

    def insert(self, data):
        # Keep pre-set data (from set_table_data) so response validates.
        # Only use inserted data if no pre-set data exists.
        if isinstance(data, dict) and not self._data:
            self._data = [data]
        return self

    def update(self, data):
        return self

    def delete(self):
        return self

    def eq(self, *_a, **_kw):
        return self

    def order(self, *_a, **_kw):
        return self

    def single(self):
        """Mark this query as single-row (returns dict, not list)."""
        self._is_single = True
        return self

    def execute(self):
        data = self._data
        if self._is_single and isinstance(data, list):
            data = data[0] if data else None
        # Reset _is_single for next call chain on same builder
        self._is_single = False
        return SimpleNamespace(data=data, error=self._error)


class FakeSupabase:
    """Minimal Supabase mock supporting auth + table operations."""

    def __init__(self):
        self.auth = MagicMock()
        self._tables: dict[str, list] = {}

    def table(self, name: str):
        """Return a fresh builder with the stored data for this table."""
        data = self._tables.get(name, [])
        return FakeSupabaseBuilder(data=list(data))

    def set_table_data(self, name: str, data: list | None = None, error=None):
        self._tables[name] = data if data is not None else []


# --- Fixtures ----------------------------------------------------------------

@pytest.fixture()
def fake_sb():
    """Create a FakeSupabase and patch get_supabase everywhere it's imported."""
    sb = FakeSupabase()
    with patch("api.core.security.get_supabase", return_value=sb), \
         patch("api.routes.residents.get_supabase", return_value=sb), \
         patch("api.routes.resolutions.get_supabase", return_value=sb):
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
    """Return a TestClient where require_admin is overridden.

    Skips JWT + role check entirely — for testing endpoint logic only.
    """
    from api.core.security import require_admin

    app.dependency_overrides[require_admin] = lambda: {
        "sub": "admin-1", "email": "admin@gabi.pl",
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
