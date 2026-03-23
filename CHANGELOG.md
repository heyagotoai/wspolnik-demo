# Changelog — WM Gabi

## [Faza 1] — Fundament (w trakcie)

### 2026-03-23 — Optymalizacja ładowania stron + fix SPA routing
- Fix Vercel rewrite: SPA routing (`/admin/lokale`, itp.) zwracało 404 po odświeżeniu — poprawiony destination w `vercel.json`
- Cache auth headers w `api.ts` — równoległe requesty współdzielą jeden lookup sesji (5s TTL), eliminuje powtórne `getSession()`
- `ChargesPage`: `Promise.all` dla fetchChargesData/fetchRates/fetchAutoConfig zamiast osobnych wywołań
- Rozróżnienie "błąd ładowania stawek" vs "brak stawek" — przycisk "Spróbuj ponownie" zamiast mylącego komunikatu
- Testy: nowy `api.test.ts` — 6 testów (auth, cache, metody HTTP, obsługa błędów)

### 2026-03-22 — Saldo początkowe lokalu
- Nowe pole `initial_balance` w tabeli `apartments` (migracja 010)
- Admin: edycja salda początkowego w formularzu lokalu (ujemne = zaległość, dodatnie = nadpłata)
- Panel mieszkańca: saldo uwzględnia bilans otwarcia (Finanse + Dashboard)
- Wartość domyślna: 0 (brak wpływu na istniejące lokale)

### 2026-03-22 — System automatycznego generowania naliczeń
- Nowa tabela `charge_rates` — stawki z wersjonowaniem (`valid_from`), snapshot approach
- Wzory: eksploatacja = m² × stawka, fundusz remontowy = m² × stawka, śmieci = osoby × stawka
- Backend: 4 endpointy API (`/api/charges`) — generowanie + CRUD stawek
- Admin panel: zakładki Naliczenia/Stawki, przycisk "Generuj naliczenia", CRUD stawek
- Pole `declared_occupants` w tabeli `apartments` + w UI lokali
- Flaga `is_auto_generated` w tabeli `charges` — badge "Auto"/"Ręczne" w tabelach
- Usunięcie typów woda/ogrzewanie (rozliczane bezpośrednio przez dostawców)
- Opcja auto-generowania: toggle + dzień miesiąca, Vercel Cron Job (`CRON_SECRET`)
- Migracja 008 (stawki), migracja 009 (system_settings), testy: 21 backend (pytest)
- Dokumentacja: [[ADR-012-charge-generation]]

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

### 2026-03-22 — Naprawa lokalu w Finanse (RLS fallback)
- Problem: mieszkaniec z ustawionym `residents.apartment_number` nie widział lokalu w Finanse, bo RLS apartments blokował odczyt gdy `owner_resident_id` nie był ustawiony
- Migracja 007: aktualizacja funkcji `my_apartment_ids()` i policy `apartments_select` — fallback do `residents.apartment_number`
- Backend: przy update mieszkańca z nowym `apartment_number` automatycznie synchronizuje `apartments.owner_resident_id`
- Frontend: Finanse i Dashboard używają dwuetapowego lookup (owner_resident_id → fallback apartment_number)

### 2026-03-22 — Terminy głosowań w panelu Terminy
- Strona Terminy pokazuje teraz daty końca głosowania jako wydarzenia wymagające uwagi
- Tylko uchwały, w których użytkownik jeszcze nie głosował; znikają po oddaniu głosu
- Wyróżnienie wizualne: czerwona ramka, badge "Głosowanie", link do panelu głosowań
- Dashboard: karta TERMINY uwzględnia obie źródła (important_dates + voting_end nieodgłosowanych uchwał)

### 2026-03-22 — Eksport PDF wyników głosowania (uchwały)
- Backend: nowy endpoint `GET /api/resolutions/{id}/votes` (admin) — lista głosów z danymi mieszkańców (imię, lokal, głos, data)
- Frontend: przycisk eksportu PDF przy każdej uchwale w statusie voting/closed (panel admina)
- PDF: podsumowanie (za/przeciw/wstrzymuje + procenty) + tabela imiennych głosów sortowana po numerze lokalu
- Generowanie przez natywny browser print API — bez zewnętrznych bibliotek
- Testy: 4 backend + 3 frontend

### 2026-03-22 — Śledzenie przeczytanych ogłoszeń
- Frontend: badge "Nowe" na liście ogłoszeń i w dashboardzie
- Logika: krótkie ogłoszenia (≤200 znaków) oznaczane jako przeczytane przy załadowaniu; długie (z "Czytaj więcej") — po rozwinięciu przez użytkownika
- Przechowywanie w `localStorage` per user ID — bez zmian w bazie
- Dashboard: karta "Ogłoszenia" wyświetla rzeczywistą liczbę nieprzeczytanych

### 2026-03-22 — Mailing ogłoszeń do mieszkańców
- Backend: endpoint `POST /api/announcements/{id}/send-email` (admin only)
- Wysyłka email do wszystkich aktywnych mieszkańców przez Edge Function
- Frontend: przycisk wysyłki email + badge "Wysłano" w panelu ogłoszeń admina
- Dialog potwierdzenia przed wysyłką, toast z wynikiem
- Zabezpieczenie przed duplikatem (kolumna `email_sent_at`, migracja 006)
- Testy: 6 backend + 5 frontend

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
