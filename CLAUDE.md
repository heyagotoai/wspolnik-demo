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
    lib/        — supabase.ts, api.ts (401 + retry sesji), voteResultsDisplay.ts, money.ts (saldo PLN), userFacingErrors.ts, authLoginErrors.ts
    pages/      — publiczne + resident/ + admin/
api/            — backend FastAPI
  core/         — config, security, supabase_client, voting_eligibility (kto może głosować w uchwałach)
  models/       — Pydantic schemas
  routes/       — residents, contact, resolutions, profile, charges, audit, backup, billing_groups, import_routes, …
supabase/
  migrations/   — SQL migracje (uruchamiane przez Supabase SQL Editor)
docs/           — Obsidian vault (ADR-y, koncepty, architektura)
```

**Panel Uchwały (`site/src/pages/admin/ResolutionsPage.tsx`):** głosy z zebrania (modal), eksport PDF; pasek akcji — «Głosy z zebrania», potem ikony (reset głosów, PDF, edycja, usuń). Szczegóły: `docs/decisions/ADR-010-voting-system.md`.

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

**Python (venv, Windows):** interpreter projektu to **`D:\_AI\gabi_site\.venv\Scripts\python.exe`** (katalog venv: `.venv` w katalogu głównym repo). Gdy w terminalu brak `python`/`pytest` w PATH, użyj tej ścieżki lub `.\.venv\Scripts\Activate.ps1` przed komendami w `api/`.

## Zasady implementacji

### Podejście do implementacji (WYMAGANE — "Junior Review")
- **Po zakończeniu implementacji nowej funkcjonalności, przed uznaniem za gotową** — zadaj użytkownikowi co najmniej 3 pytania sprawdzające poprawność działania. Pytaj o edge cases, zachowanie brzegowe, scenariusze które mogły umknąć.
- **Cel:** zapobieganie zamknięciu zadania z błędnymi założeniami. Użytkownik weryfikuje, nie Claude.
- Korzystaj z notatek w Obsidian (`docs/`) jako źródła kontekstu przy formułowaniu pytań.

### UI/UX
- **Toasty zamiast alert/confirm** — nigdy nie używaj natywnych `alert()`, `confirm()`, `prompt()`. Zawsze toast lub custom modal.

### Bezpieczeństwo (KRYTYCZNE)
- **RODO/GDPR** — minimalizacja danych, prawo do usunięcia, pseudonimizacja w logach
- **Row Level Security** — mieszkaniec widzi TYLKO swoje dane (RLS w Supabase)
- **Audit log** — operacje finansowe i głosowania muszą być logowane (triggery na charges, payments, charge_rates, bank_statements, apartments, votes)
- **Retencja danych finansowych** — max 5 lat
- Nie commituj `.env` — sekrety tylko w zmiennych środowiskowych

### Import danych finansowych
- **Zestawienie bankowe (.xls)** — `POST /api/import/payments-bank-statement` (xlrd, dopasowanie po `apartments.billing_surname` i numerach lokali z opisu/adresu przelewu). Parser: `api/services/bank_statement_parser.py`.
- **Stan początkowy i wpłaty z Excel (.xlsx)** — `GET/POST /api/import` (szablon, `initial-state`, `payments`, `payments-template`, `openpyxl`), UI w panelu Lokale.
- **Deduplikacja wpłat** (import `.xls` i import wpłat `.xlsx`) — para `(apartment_id, payment_date)`; ponowny import tego samego pliku nie dubluje zapisów; szczegóły: `docs/decisions/ADR-014-payment-import-deduplication.md`.
- **MT940** — niewymagane; pozostajemy przy zestawieniach bankowych w `.xls` i imporcie ręcznym `.xlsx`.

### Testy (WYMAGANE)
- **Wersje bibliotek** — `api/requirements.txt` używa `==` dla wszystkich pakietów; `site/package.json` ma przypięte wersje bez `^`/`~` (spójnie z `package-lock.json`). Podbicie wersji: świadomie, po testach (`pytest`, `npm test`).
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
- **Karty produktu (para dokumentów):** `docs/KARTA_PRODUKTU.md` (informacyjna) oraz `docs/KARTA_PRODUKTU_OFERTA.md` (zapytanie ofertowe). Przy każdej zmianie **zakresu opisanego produktu** aktualizuj **oba** pliki, tak aby treść funkcjonalna pozostała zgodna (różnica tylko w tonie: oferta vs opis; sekcje specyficzne dla oferty zostaw wyłącznie w pliku `_OFERTA`).

### Polecenie "zaktualizuj" (WYMAGANE)
Gdy użytkownik mówi **"zaktualizuj"** po zakończeniu implementacji, zaktualizuj **wszystkie** powiązane artefakty:
- **Dokumentacja Obsidian** (`docs/`) — odpowiednie notatki, koncepty, ADR-y; jeśli dotyczy zakresu produktu — **`docs/KARTA_PRODUKTU.md` i `docs/KARTA_PRODUKTU_OFERTA.md` razem**
- **Feature map / Roadmap** (`docs/feature-map.md` lub podobne) — status funkcjonalności
- **CHANGELOG.md** — opis zmian
- **CLAUDE.md** — jeśli zmiany wpływają na strukturę, endpointy, stack, zasady
- **Pamięć Claude** (`memory/`) — jeśli zmiany wpływają na postęp projektu lub kontekst
- **Testy** — jeśli jeszcze nie zaktualizowane
- W skrócie: **wszystko co możliwe** — nie czekaj na osobne polecenia dla każdego artefaktu

### Dokumentacja operacyjna (WYMAGANE)
- Przy zmianach wpływających na deploy, konfigurację lub utrzymanie systemu — aktualizuj `docs/operations/` (instrukcje wdrożenia, utrzymania, procedury awaryjne)
- Cel: każda osoba z dostępem do repo powinna móc zdeployować i utrzymywać system bez wiedzy plemiennej

### Synchronizacja z Cursorem (WYMAGANE)
Gdy dodajesz nową zasadę, skill lub subagenta do `CLAUDE.md`, **musisz** równocześnie dodać odpowiednik do `.cursorrules` (i odwrotnie — jeśli Cursor doda coś do `.cursorrules`, zaktualizuj `CLAUDE.md`).
- Oba pliki muszą być zsynchronizowane pod względem zasad i reguł projektu.
- Różnice techniczne (np. pamięć Claude, format subagentów) dostosuj do możliwości danego narzędzia.

## Role użytkowników
- **admin** — pełny dostęp (CRUD: lokale, mieszkańcy, ogłoszenia, dokumenty, terminy, naliczenia, uchwały, wiadomości kontaktowe)
- **manager** (zarządca) — podgląd read-only (mieszkańcy, lokale, finanse, dokumenty, uchwały, wiadomości, audit log) + pełny CRUD ogłoszeń i terminów. BEZ: zarządzania kontami, stawek, generowania naliczeń, wysyłki email
- **mieszkaniec** — dashboard z saldem, finanse (naliczenia/wpłaty), ogłoszenia, dokumenty, terminy, głosowania, profil

## Supabase
- Region: EU (Frankfurt)
- Auth: email whitelist (publiczna rejestracja wyłączona, admin dodaje mieszkańców)
- Storage: bucket "documents" (prywatny, max 10MB, tylko PDF)
- Edge Function: `send-email` — relay SMTP do az.pl (patrz ADR-011)
- Storage: bucket "backups" (prywatny, max 50MB, JSON — tygodniowy backup cron)
- Migracje 001-025 (m.in. 017 zarządca, 018 grupy rozliczeniowe, 019 billing_surname, 020 zgody RODO w `residents`, 021 `announcements.is_public`, 022 domyślna wartość `is_public`, 023 widok `last_import_activity` dla „Saldo na dzień" w panelu mieszkańca, 024 `resolutions.is_test` + `reminder_sent_at`, 025 `residents.email` nullable + `has_account`) — uruchamiane przez SQL Editor w dashboardzie Supabase

## API endpoints
- `POST /api/residents` — CRUD mieszkańców (admin, tworzy auth user); email + password **opcjonalne** — brak = mieszkaniec „bez konta" (`has_account=false`, placeholder auth user z banem ~100 lat, `residents.email=NULL`); `PATCH /residents/:id` z email+password dla `has_account=false` → nadanie konta (unban + `has_account=true`); `POST /residents/{id}/apartments` + `DELETE /residents/{id}/apartments/{apt_id}` — przypisanie/odpięcie lokalu do istniejącego właściciela (jeden właściciel → wiele lokali)
- `POST /api/contact` — formularz kontaktowy (publiczny, bez auth, email via Edge Function)
- `/api/resolutions` — CRUD uchwał + głosowanie + reset głosów; `POST :id/votes/register` (głosy z zebrania, tylko szkic) + `DELETE :id/votes/:resident_id` (pojedynczy głos, tylko szkic); `GET :id/results` — agregacja z wagami udziałów (`apartments.share`, właściciel lokalu); `POST :id/vote` — uprawnienia wg `voting_eligibility` (mieszkaniec; admin/zarządca tylko jako właściciel lokalu); `voting_start`/`voting_end` wymagane przy zapisie; `GET /resolutions/cron/close-ended` (cron, `CRON_SECRET`) — `voting` → `closed` po `voting_end`; **`POST :id/remind?dry_run=bool`** (admin) — przypomnienia e-mail do uprawnionych, którzy nie głosowali (dry-run = lista bez wysyłki; ignoruje `is_test`); **`GET /resolutions/cron/remind-pending`** (cron, `CRON_SECRET`) — codziennie, okno ≤ 2 dni do `voting_end`, pomija `is_test` i już wysłane (`reminder_sent_at IS NULL`); pole **`is_test`** ukrywa uchwałę przed mieszkańcami, blokuje auto-ogłoszenie i cron przypomnień
- `/api/profile` — profil + `can_vote_resolutions`, zgody RODO: `needs_legal_acceptance`, wersje dokumentów; **`POST /profile/legal-consent`** — akceptacja polityki i regulaminu (wymóg przed panelem); wersje obowiązujące: env `CURRENT_PRIVACY_VERSION`, `CURRENT_TERMS_VERSION`
- `/api/charges` — naliczenia (generowanie, regeneracja, CRUD stawek, wysyłka salda PDF: pojedyncza + masowa, zawiadomienie o opłatach: preview PDF + wysyłka email + bulk + config podstawy prawnej); **GET** `/charges/rates` i `/charges/auto-config` — tylko admin lub manager (mieszkaniec nie pobiera przez API)
- `GET /api/audit` — dziennik operacji (admin lub zarządca, filtry: tabela/akcja/daty, paginacja)
- `POST /api/backup/cron` — tygodniowy backup do Storage (cron, 12 tyg. retencji, email notification)
- `GET /api/retention/cron` — kwartalny cron RODO: carry-forward salda + usuwanie danych finansowych >5 lat (charges, payments, bank_statements, audit_log); email do adminów/zarządców
- `/api/billing-groups` — grupy rozliczeniowe (CRUD grup, przypisywanie lokali, rozbicie wpłat, saldo łączne — 8 endpointów)
- `/api/import` — import z Excel (`GET /template`, `POST /initial-state`, `GET /payments-template`, `POST /payments`, `POST /payments-bank-statement`, admin)
- `GET /api/health` — health check
