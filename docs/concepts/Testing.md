# Testing

## Czym jest

System testów automatycznych projektu GABI. Składa się z dwóch niezależnych zestawów:
- **Backend** (Python/pytest) — testy API i bezpieczeństwa
- **Frontend** (TypeScript/vitest) — testy komponentów React

## Dlaczego to istnieje

Testy chronią przed regresją — zmiana w jednym miejscu nie psuje czegoś w innym. Szczególnie ważne dla:
- Logiki autoryzacji (kto ma dostęp do czego)
- Walidacji danych (Pydantic models, formularze)
- Zachowania UI (routing, toasty, dialogi)

## Jak działa

### Backend — FakeSupabase

Zamiast łączyć się z prawdziwym Supabase, testy używają `FakeSupabase` (zdefiniowany w `api/tests/conftest.py`). To lekki mock, który:
- Symuluje `sb.table("residents").select().eq().execute()`
- Pozwala ustawić dane zwracane przez tabelę: `fake_sb.set_table_data("residents", [...])`
- Mockuje `sb.auth.get_user()` dla testów JWT

Dwa rodzaje klientów testowych:
- `client` — pełny flow auth (JWT → rola → endpoint)
- `admin_client` — pomija auth (dependency_overrides), testuje czystą logikę

### Frontend — Supabase mock + Testing Library

Globalne mockowanie Supabase SDK w `site/src/test/setup.ts`. Testy:
- Renderują komponenty z odpowiednim kontekstem (AuthContext, ToastProvider)
- Symulują interakcje użytkownika (`userEvent.click`, `userEvent.type`)
- Sprawdzają co widzi użytkownik (`screen.getByText`, `screen.queryByText`)

## Uruchamianie

```bash
# Backend
cd api
.venv/Scripts/python -m pytest tests/ -v

# Frontend
cd site
npm test              # jednorazowo (CI)
npm run test:watch    # tryb watch (dev)
npm run test:coverage # z pokryciem kodu
```

## Powiązane
- [[ADR-009-testing-strategy]] — decyzja architektoniczna
- [[FastAPI]] — framework backendowy
- [[Toast i ConfirmDialog]] — testowane komponenty UI
