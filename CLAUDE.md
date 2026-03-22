# WM GABI — System zarządzania wspólnotą mieszkaniową

## Język komunikacji
Komunikuj się po polsku.

## Stack technologiczny
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + React Router 7
- **Backend:** FastAPI (Python) — deployed na Vercel (serverless functions)
- **Baza + Auth + Storage:** Supabase (PostgreSQL, RLS, Auth z email whitelist, Storage)
- **Hosting:** Vercel (darmowy tier) — frontend i backend
- **Supabase Edge Functions:** Tylko relay SMTP (send-email) — logika biznesowa w FastAPI
- **Domena:** wmgabi.pl (DNS: az.pl, hosting: Vercel)
- **Poczta:** az.pl (powiadomienia@wmgabi.pl → SMTP relay przez Edge Function)

## Struktura projektu
```
site/           — frontend React (Vite)
  src/
    components/ — komponenty UI (auth/, layout/, ui/)
    hooks/      — useAuth, useRole
    lib/        — supabase.ts (klient), api.ts (FastAPI klient)
    pages/      — publiczne + resident/ + admin/
api/            — backend FastAPI
  core/         — config, security, supabase_client
  models/       — Pydantic schemas
  routes/       — residents.py, contact.py, resolutions.py, profile.py
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
- **admin** — zarządca wspólnoty (CRUD: lokale, mieszkańcy, ogłoszenia, dokumenty, terminy, naliczenia, uchwały, wiadomości kontaktowe)
- **mieszkaniec** — dashboard z saldem, finanse (naliczenia/wpłaty), ogłoszenia, dokumenty, terminy, głosowania, profil

## Supabase
- Region: EU (Frankfurt)
- Auth: email whitelist (publiczna rejestracja wyłączona, admin dodaje mieszkańców)
- Storage: bucket "documents" (prywatny, max 10MB, tylko PDF)
- Edge Function: `send-email` — relay SMTP do az.pl (patrz ADR-011)
- Migracje 001-005 uruchomione przez SQL Editor w dashboardzie Supabase

## API endpoints
- `POST /api/residents` — CRUD mieszkańców (admin, tworzy auth user)
- `POST /api/contact` — formularz kontaktowy (publiczny, bez auth, email via Edge Function)
- `/api/resolutions` — CRUD uchwał + głosowanie (7 endpointów)
- `/api/profile` — profil mieszkańca
- `GET /api/health` — health check
