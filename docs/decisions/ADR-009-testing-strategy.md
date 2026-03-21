# ADR-009: Strategia testowania

## Status
Zaakceptowane (2026-03-21)

## Kontekst
Projekt GABI nie miał żadnych testów. Wraz z rozbudową funkcjonalności (auth, CRUD, RLS) rośnie ryzyko regresji. Potrzebujemy testów, które:
- Weryfikują logikę bezpieczeństwa (JWT, role)
- Sprawdzają poprawność endpointów API
- Testują zachowanie komponentów frontendowych (routing, formularze, UI)

## Decyzja

### Backend: pytest + TestClient
- **Framework**: `pytest` z `httpx` (FastAPI TestClient)
- **Lokalizacja**: `api/tests/`
- **Podejście**: mockowanie Supabase (FakeSupabase) + FastAPI dependency_overrides
- **Nie łączymy się** z prawdziwą instancją Supabase w unit testach

### Frontend: vitest + React Testing Library
- **Framework**: `vitest` (natywne wsparcie Vite) + `@testing-library/react`
- **Lokalizacja**: pliki `.test.tsx` obok komponentów (co-location)
- **Podejście**: mockowanie Supabase SDK, testowanie zachowania użytkownika (nie implementacji)

### Struktura testów

```
api/tests/
├── conftest.py           # FakeSupabase, fixtures (client, admin_client)
├── test_security.py      # JWT, require_admin
└── test_residents.py     # CRUD endpointy

site/src/
├── test/setup.ts         # Globalna konfiguracja vitest
├── components/auth/
│   ├── ProtectedRoute.test.tsx
│   └── AdminRoute.test.tsx
├── components/ui/
│   ├── Toast.test.tsx
│   └── ConfirmDialog.test.tsx
└── pages/admin/
    └── ResidentsPage.test.tsx
```

## Uruchamianie

```bash
# Backend (z katalogu api/)
.venv/Scripts/python -m pytest tests/ -v

# Frontend (z katalogu site/)
npm test            # jednorazowo
npm run test:watch  # tryb watch
```

## Alternatywy rozważane

### Testy integracyjne z prawdziwym Supabase
Odrzucone na ten moment — wymagałoby staging environment + seed data. Rozważymy gdy pojawi się potrzeba testowania RLS policies end-to-end.

### Jest zamiast vitest
Odrzucony — vitest jest natywnie zintegrowany z Vite, zero dodatkowej konfiguracji, szybszy cold start.

## Konsekwencje
- Każda nowa funkcjonalność powinna mieć odpowiadające testy
- CI/CD powinno uruchamiać testy przed deploy (do skonfigurowania)
- FakeSupabase wymaga aktualizacji gdy dodamy nowe operacje bazodanowe
