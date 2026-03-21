# Changelog — WM Gabi

## [Faza 1] — Fundament (w trakcie)

### 2026-03-15
- Schemat bazy danych (migracja 001) — tabele: residents, apartments, charges, payments, bank_statements, documents, announcements, important_dates, resolutions, votes, audit_log
- Polityki RLS (migracja 002) — bezpieczeństwo na poziomie wierszy dla wszystkich tabel

### 2026-03-21 — Dokumentacja projektu (nie feature aplikacji)
- Wdrożenie systemu zarządzania wiedzą (Obsidian vault w projekcie) — narzędzie deweloperskie do dokumentowania decyzji architektonicznych, nie część aplikacji WM Gabi
- Struktura `docs/`: decisions, concepts, architecture
- ADR-y (8): stack, RLS, auth pattern, data access, UI/lokalizacja, FastAPI struktura, wycofany trigger, layouty
- Koncepty (11): RLS, SECURITY DEFINER, JWT, Supabase, Supabase Storage, FastAPI, Vercel, service_role key, Toast/ConfirmDialog, Icons, mockData, API Client
- Architektura: system overview + pełna mapa funkcjonalności
- Pełna dokumentacja obecnego stanu projektu
