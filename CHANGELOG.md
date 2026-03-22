# Changelog — WM Gabi

## [Faza 1] — Fundament (w trakcie)

### 2026-03-15
- Schemat bazy danych (migracja 001) — tabele: residents, apartments, charges, payments, bank_statements, documents, announcements, important_dates, resolutions, votes, audit_log
- Polityki RLS (migracja 002) — bezpieczeństwo na poziomie wierszy dla wszystkich tabel

### 2026-03-21 — System głosowania nad uchwałami
- Backend: 7 endpointów API (`/api/resolutions`) — CRUD (admin) + głosowanie + wyniki
- Admin panel: `/admin/uchwaly` — tworzenie/edycja/usuwanie uchwał, workflow statusów (szkic → głosowanie → zamknięta), podgląd wyników
- Panel mieszkańca: `/panel/glosowania` — lista aktywnych uchwał, przyciski głosowania (za/przeciw/wstrzymuję), pasek wyników, info o oddanym głosie
- Głosy jednorazowe i nieodwracalne (UNIQUE constraint + brak UPDATE/DELETE policy)
- Testy: 14 backend (pytest) + 12 frontend (vitest)
- Dokumentacja: [[ADR-010-voting-system]], aktualizacja feature-map

### 2026-03-22 — Deployment na Vercel + domena wmgabi.pl
- Frontend wdrożony na Vercel (monorepo: site/ + api/ serverless functions)
- Domena wmgabi.pl podpięta (DNS: az.pl → Vercel)
- Poczta: powiadomienia@wmgabi.pl na az.pl
- Email via Supabase Edge Function (Vercel blokuje SMTP — ADR-011)
- Fix: błędy TypeScript (unused imports, vitest config, error.status)
- Profil mieszkańca: `/panel/profil` + endpoint `/api/profile`

### 2026-03-21 — Dokumentacja projektu (nie feature aplikacji)
- Wdrożenie systemu zarządzania wiedzą (Obsidian vault w projekcie) — narzędzie deweloperskie do dokumentowania decyzji architektonicznych, nie część aplikacji WM Gabi
- Struktura `docs/`: decisions, concepts, architecture
- ADR-y (8): stack, RLS, auth pattern, data access, UI/lokalizacja, FastAPI struktura, wycofany trigger, layouty
- Koncepty (11): RLS, SECURITY DEFINER, JWT, Supabase, Supabase Storage, FastAPI, Vercel, service_role key, Toast/ConfirmDialog, Icons, mockData, API Client
- Architektura: system overview + pełna mapa funkcjonalności
- Pełna dokumentacja obecnego stanu projektu
