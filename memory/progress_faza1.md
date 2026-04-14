---
name: Postęp projektu — Fazy 1–6
description: Co jest gotowe, co czeka; aktualny stan faz implementacji WM GABI
type: project
---

Pełne fazy 1–6 są ukończone. Aktualny status kluczowych obszarów:

**Auth i sesja:**
- Login, ProtectedRoute, AdminRoute, role (admin/manager/resident)
- `useIdleLogout`: auto-wylogowanie po bezczynności — admin 15 min (ostrzeżenie 60 s + `IdleWarningDialog`), mieszkaniec 30 min; timer niezależny od widoczności karty (karta w tle wygasa tak samo)
- Stabilna referencja `user` w `useAuth.onAuthStateChange` — `TOKEN_REFRESHED` nie odmontowuje widoków ani formularzy
- Zgody RODO (LegalConsentGate, ADR-015), wersjonowanie przez env

**Finanse:**
- Naliczenia, stawki, saldo, import Excel (.xlsx), import banku (.xls), deduplikacja (ADR-014)
- Zawiadomienia o opłatach (PDF + email, masowe), wysyłka salda
- Grupy rozliczeniowe (8 endpointów)
- Retencja RODO 5 lat (cron kwartalny, carry-forward)

**Uchwały / głosowania:**
- CRUD, workflow draft→voting→closed, głosy z zebrania (modal), wagi udziałów
- Eksport PDF, reset głosów, cron zamknięcia (ADR-010)

**Bezpieczeństwo:**
- RLS Supabase + testy izolacji (55 testów), pentest 2026-03-27 (czysty)
- Rate limiting (kontakt), CSP/security headers, audit log (triggery PostgreSQL)
- CI/CD GitHub Actions (npm test + pytest), crony przeniesione z Vercel

**Infrastruktura:**
- Backup tygodniowy do Storage (12 tyg. retencji), procedury awaryjne
- Dokumentacja operacyjna (01-wdrozenie, 02-utrzymanie, 03-procedury-awaryjne)
- E2E Playwright (13 testów, prod)

**Why:** Kontekst dla nowych sesji — co zostało zrobione, w jakim stanie projekt.
**How to apply:** Przy planowaniu nowych funkcji lub debugowaniu zakresu — punkt startowy do weryfikacji aktualnego stanu.
