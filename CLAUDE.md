# WM GABI — System zarządzania wspólnotą mieszkaniową

## Język komunikacji
Komunikuj się po polsku.

## Stack technologiczny
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + React Router 7
- **Backend:** FastAPI (Python) — deployed na Vercel (serverless functions)
- **Baza + Auth + Storage:** Supabase (PostgreSQL, RLS, Auth z email whitelist, Storage)
- **Hosting:** Vercel (darmowy tier) — frontend i backend
- **Supabase Edge Functions:** NIE używane — cały backend logic w FastAPI

## Struktura projektu
```
site/           — frontend React (Vite)
  src/
    components/ — komponenty UI (auth/, admin/, resident/, shared/)
    hooks/      — useAuth, useRole
    lib/        — supabase.ts (klient)
    pages/      — public/, resident/, admin/
api/            — backend FastAPI
  core/         — konfiguracja, deps
  models/       — Pydantic models
  routes/       — endpointy API
  services/     — logika biznesowa
supabase/
  migrations/   — SQL migracje (uruchamiane przez Supabase SQL Editor)
docs/           — Obsidian vault (ADR-y, koncepty, architektura)
```

## Komendy deweloperskie
```bash
# Frontend
cd site && npm run dev

# Backend
cd api && uvicorn index:app --reload

# Oba naraz (Windows)
dev.bat

# Testy
cd site && npm test
cd api && pytest
```

## Zasady implementacji

### UI/UX
- **Toasty zamiast alert/confirm** — nigdy nie używaj natywnych `alert()`, `confirm()`, `prompt()`. Zawsze toast lub custom modal.

### Bezpieczeństwo (KRYTYCZNE)
- **RODO/GDPR** — minimalizacja danych, prawo do usunięcia, pseudonimizacja w logach
- **Row Level Security** — mieszkaniec widzi TYLKO swoje dane (RLS w Supabase)
- **Audit log** — operacje finansowe muszą być logowane
- **Retencja danych finansowych** — max 5 lat
- Nie commituj `.env` — sekrety tylko w zmiennych środowiskowych

### Import bankowy
- Format importu z banku **NIE jest jeszcze potwierdzony** — nie buduj parsera dopóki format nie będzie znany
- Schemat bazy (payments, bank_statements) jest przygotowany, logika parsowania czeka

### Testy (WYMAGANE)
- **Po zakończeniu pracy nad nową funkcjonalnością** — dodaj odpowiednie testy (backend pytest i/lub frontend vitest, zależnie od zakresu zmian)
- **Po zmianie istniejącej funkcjonalności** — zaktualizuj powiązane testy, aby odzwierciedlały nowe zachowanie
- **Przed uznaniem zadania za ukończone** — uruchom pełny zestaw testów (`npm test` + `pytest`) i upewnij się, że wszystkie przechodzą
- Backend: testy w `api/tests/`, mockowanie Supabase przez FakeSupabase (conftest.py)
- Frontend: testy `.test.tsx` obok komponentów, vitest + React Testing Library
- Patrz: `docs/decisions/ADR-009-testing-strategy.md`

### Dokumentacja
- Istotne decyzje architektoniczne → ADR w `docs/decisions/`
- Używaj `[[wiki linków]]` między notatkami w Obsidian vault
- `CHANGELOG.md` — aktualizuj przy większych zmianach

## Role użytkowników
- **admin** — zarządca wspólnoty (CRUD ogłoszeń, dokumentów, naliczeń, mieszkańców, import)
- **mieszkaniec** — widzi swoje saldo, wpłaty, naliczenia, dokumenty, ogłoszenia

## Supabase
- Region: EU (Frankfurt)
- Auth: email whitelist (publiczna rejestracja wyłączona, admin dodaje mieszkańców)
- Migracje uruchamiane ręcznie przez SQL Editor w dashboardzie Supabase
