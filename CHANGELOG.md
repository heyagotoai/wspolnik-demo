# Changelog — WM Gabi

## [Faza 1] — Fundament (w trakcie)

### 2026-03-28 — CI: Vitest nie uruchamia Playwright (e2e)
- **`vite.config.ts`:** `test.include` = tylko `src/**/*.test.ts(x)`
- **`package.json`:** `npm test` → `vitest run src` (oraz `test:watch` / `test:coverage` z katalogiem `src`) — na CI nie polegamy wyłącznie na `include` z Vite; jawna ścieżka wyklucza `e2e/*.spec.ts` nawet przy innej wersji Vitest

### 2026-03-28 — CI: zależność `xlwt` dla testów .xls
- **`xlwt==1.3.0`** w `api/requirements.txt` — generowanie plików `.xls` w `test_bank_statement_parser.py` (wcześniej na CI brak modułu `xlwt`)

### 2026-03-28 — CI: stabilny import `api.core.config` w pytest
- Na początku `api/tests/conftest.py`: `os.environ.setdefault` dla `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` — brak masowego `KeyError`, gdy job nie ustawi zmiennych lub lokalnie odpala się `pytest` bez `.env`

### 2026-03-28 — Audyt zależności (npm + pip)
- **npm:** `npm audit fix` — usunięte podatności w `brace-expansion` / `picomatch` (transitive); `npm audit` → 0
- **Python:** `fastapi` 0.115.12 → **0.135.2**, jawny **`starlette==0.49.1`** (CVE w łańcuchu ASGI), **`PyJWT==2.12.1`** (CVE); `pip-audit` — pozostaje znacznik **pygments** (CVE-2026-4539, brak nowszej wersji na PyPI — śledzić wydania)
- Instrukcja okresowego audytu: `docs/operations/02-utrzymanie.md` § Zależności

### 2026-03-28 — Przypięte wersje zależności
- **`api/requirements.txt`** — wszystkie pakiety z `==` (m.in. `openpyxl`, `xlrd`, `reportlab`, `locust`, `tzdata`), bez `>=`, żeby buildy Vercel/CI nie „pływały” przy nowych wydaniach
- **`site/package.json`** — `dependencies` / `devDependencies` bez prefiksów `^` / `~`, zgodnie z aktualnym `package-lock.json` (np. `typescript-eslint` 8.57.1)

### 2026-03-28 — Import z zestawienia bankowego (.xls)
- **Nowy endpoint:** `POST /api/import/payments-bank-statement` — import wpłat bezpośrednio z pliku .xls pobranego z banku
- **Automatyczne dopasowanie transakcji** do lokali na podstawie: numeru lokalu w opisie/adresie przelewu, nazwiska rozliczeniowego z rejestru (`billing_surname`)
- **Deduplikacja** przed zapisem: para (lokal, data) — opis decyzji: `docs/decisions/ADR-014-payment-import-deduplication.md`
- **Nowa kolumna:** `apartments.billing_surname` (migracja 019) — nazwisko rozliczeniowe edytowalne w panelu Lokale
- Logika dopasowania przeniesiona z `clean_data.py`: normalizacja tekstu (polskie znaki, warianty nazwisk SKI/SKA), heurystyki adresu (Gdańska 58/X), ekstrakcja lokalu z opisu, głosowanie wagowe
- Tylko wpłaty (kwota > 0) importowane; niedopasowane transakcje w raporcie podglądu (dry_run)
- Frontend: `ImportBankStatementModal` z podglądem dopasowań i niedopasowań, przycisk „Import z banku (.xls)" w panelu Lokale
- Zależność: `xlrd>=2.0.1` do odczytu starych plików Excel
- Testy: `api/tests/test_bank_statement_parser.py` (38 testów: parser, dopasowanie, endpoint)

### 2026-03-28 — Inter self-host (CSP / Google Fonts)
- Font **Inter** z `@fontsource/inter` (subsety `latin` + `latin-ext`, wagi 400–700) — pliki z bundla Vite, bez żądań do `fonts.googleapis.com` / `fonts.gstatic.com`, zgodne z obecnym CSP `font-src 'self'` w `vercel.json`

### 2026-03-28 — Import wpłat z Excela (dopasowania)
- **Deduplikacja** jak przy imporcie zestawienia bankowego: para (lokal, data) — jeśli wpłata już jest w bazie lub pojawiła się wcześniej w tym samym pliku, wiersz (lub pojedyncza data w wielu datach) jest pomijany ze statusem „Pominięty” i komunikatem o duplikacie; import zbiorczy wielu lokali jest pomijany, gdy **którykolwiek** lokal ma już wpłatę w tym dniu — `docs/decisions/ADR-014-payment-import-deduplication.md`
- Arkusz **Dopasowania**: kolumny **Lokal**, **Data wpłaty**, **Kwota** (np. nazwisko — ignorowane)
- **Wiele dat** w komórce (`10.02.2026; 27.02.2026`): jedna kwota bez średnika → **ta sama kwota** na każdą datę (osobne wpłaty); **różne kwoty** → `341,20; 450,00` w tej samej kolejności co daty
- Wiele dat **+ wiele lokali** w jednym wierszu: błąd — podziel na wiersze lub jedna data
- `GET /api/import/payments-template`, `POST /api/import/payments?dry_run=`; wpłata na wielu lokalach: parent + dzieci (`api/core/payment_split.py`, proporcje z naliczeń lub równo)
- Frontend: `ImportPaymentsModal`; testy: `api/tests/test_import_payments.py`, `api/tests/test_payment_split.py`

### 2026-03-28 — Import Excel: stan początkowy (grupy + lokale zbiorcze)
- **`numer_lokalu`**: najpierw dopasowanie **dokładnego** numeru z bazy (np. `3,4A`, `25,26` — jeden rekord „zbiorczy”); jeśli brak takiego klucza — rozbicie listy (przecinek, średnik, `|`, tab) oraz wzorce `25.26` / `3.4A` (float lub tekst z kropką z Excela)
- Normalizacja separatorów Unicode (wide comma/dot), `openpyxl` `load_workbook(..., read_only=False)` dla stabilniejszego odczytu tekstu
- Frontend: `ImportInitialStateModal` — krótki opis przecinka w Excelu PL (saldo vs lista numerów)
- Testy: `api/tests/test_import.py` (grupy, float, lokale zbiorcze jednym rekordem)

### 2026-03-28 — Panel Terminy + kolejność sidebara
- Panel Terminy: scalone widoki ręcznych terminów (`important_dates`) i dat głosowań z uchwał
- Daty głosowań pobierane bezpośrednio z Supabase (bez zależności od backendu)
- `voting_start`: tylko dla uchwał `status='voting'`; `voting_end`: dla `voting` i `closed` (wyszarzone)
- Sortowanie malejące (najnowsze na górze), link "Uchwały →" do panelu uchwał
- Sidebar admina: nowa kolejność (Pulpit > Lokale > Naliczenia > Mieszkańcy > Uchwały > Dokumenty > Terminy > Ogłoszenia > Wiadomości > Dziennik operacji)

### 2026-03-28 — Rola zarządcy (manager)
- Nowa rola `manager` — podgląd read-only wszystkich danych + pełny CRUD ogłoszeń i terminów
- Migracja 017: rozszerzenie CHECK constraint, helper functions (`is_manager()`, `is_admin_or_manager()`), 20+ RLS policies
- Backend: `require_admin_or_manager` guard (FastAPI), aktualizacja endpointów (announcements, audit)
- Frontend: `useRole` hook z `isManager`/`isAdminOrManager`, warunkowe ukrywanie akcji w 8 stronach admin
- Sidebar: link "Panel zarządcy" dla managera w panelu mieszkańca, filtrowanie pozycji w panelu admin
- Mieszkańcy: podgląd read-only dla zarządcy (bez Dodaj/Edytuj/Usuń/Aktywuj)
- Badge zarządcy: niebieski (`sky-100/sky-700`), odróżnia się od admina (amber) i mieszkańca (sage)
- Testy: 7 testów frontend (ResidentsPage, AdminRoute), fixture `manager_client` (pytest)

### 2026-03-28 — Tygodniowy backup cron
- Nowy endpoint `POST /api/backup/cron` — Vercel Cron co niedzielę 2:00 UTC
- Eksport 9 tabel + `auth.users` (Admin API) + pliki PDF z bucketu `documents` (base64)
- Zapis do Supabase Storage (bucket `backups`), retencja 12 tygodni
- Email notification do adminów: `[WM GABI] Backup OK` / `Backup NIEUDANY`
- Migracja 016: bucket `backups` (prywatny, 50MB, JSON only)
- 9 testów pytest (auth, eksport, cleanup, notification, dokumenty)

### 2026-03-27 — Testy E2E (Playwright)
- 13 testów Playwright (Chromium) na produkcji (wmgabi.pl): **13/13 passed**
- Logowanie (4): mieszkaniec, admin, błędne hasło, puste pola
- Głosowanie (4): lista uchwał, oddanie głosu, weryfikacja po głosowaniu, wyniki
- Finanse (5): saldo + badge, karty podsumowania, naliczenia miesięczne, historia wpłat
- Konta testowe: `e2e_admin@wmgabi.pl`, `e2e_resident@wmgabi.pl` (lokal 99)
- Helper `waitForLoaded()` — czeka aż Supabase/Vercel załaduje dane
- Skrypty: `npm run test:e2e` / `npm run test:e2e:headed`

### 2026-03-27 — Testy obciążeniowe (Locust)
- Dodano infrastrukturę testów obciążeniowych: `api/tests/load/locustfile.py` (Locust) + `api/tests/test_concurrency.py` (4 testy race condition)
- Scenariusze: ResidentUser (przeglądanie + głosowanie, waga 10) + AdminUser (residents/audit/rates, waga 1)
- Wynik testu na produkcji (wmgabi.pl): **0 błędów aplikacji**, median 460-630ms, p99 do 3500ms (cold starty Vercel)
- Współbieżne głosowanie działa poprawnie — brak race conditions
- `locust` dodany do `requirements.txt`

### 2026-03-27 — Pentest bezpieczeństwa (19/19 testów)
- Przeprowadzono pełny pentest na środowisku produkcyjnym: RLS (6 tabel), IDOR API (5 endpointów), autentykacja (3 scenariusze), IDOR głosowania, XSS (statyczny), Storage (3 testy)
- Wynik: **19/19 testów zaliczonych, brak luk bezpieczeństwa**
- Raport: `docs/security/pentest-2026-03-27.md`
- Feature map: Pentest RLS i IDOR oznaczone jako ✅ done

### 2026-03-26 — Obsługa wygasłych sesji (session expiry)
- Fix: wygasły refresh token powodował kaskadę błędów (401, CSS MIME error) zamiast przekierowania na logowanie
- `useAuth` — wykrywanie wygasłej sesji (`getSession` error + nieoczekiwany `SIGNED_OUT`) z flagą `session_expired`
- `api.ts` — na odpowiedź 401: czyszczenie cache headerów, signOut, flaga session_expired (dotyczy też `getBlob`)
- `LoginPage` — toast "Sesja wygasła — zaloguj się ponownie" gdy redirect z wygasłej sesji
- Celowe wylogowanie (`signOut`) nie pokazuje toasta (ref `signingOut`)

### 2026-03-26 — Dziennik operacji (audit log) + bezpieczeństwo głosowań
- Nowa strona w panelu admina: **Dziennik operacji** (`/admin/dziennik`) — podgląd audit logu z filtrami i paginacją
- Nowy endpoint `GET /api/audit` — lista wpisów audit log (admin only), filtry: tabela, akcja, zakres dat, paginacja
- Migracja 015: trigger `audit_votes` na tabeli `votes` (INSERT/DELETE) — każde oddanie i usunięcie głosu jest logowane
- Nowa akcja `votes_reset` — snapshot wszystkich głosów przed resetem (ręcznym lub cofnięciem do szkicu)
- Frontend: czytelne polskie opisy akcji, rozwijane szczegóły JSON, badge'e akcji
- Poprawka bezpieczeństwa: przed usunięciem głosów (reset/cofnięcie do draft) zapisywany jest pełny snapshot do `audit_log`
- Testy: 10 nowych backend (pytest) + 7 nowych frontend (vitest); łącznie: **190** pytest, **100** vitest

### 2026-03-25 — Zawiadomienie o opłatach (wydruk + wysyłka)
- Nowa funkcjonalność: formalne "Zawiadomienie o opłatach" — PDF z tabelą stawek per lokal, podstawą prawną, danymi do przelewu
- `api/core/zawiadomienie_pdf.py` — generator PDF (ReportLab, układ wzorowany na oficjalnym piśmie wspólnoty)
- Nowe endpointy w `/api/charges`:
  - `GET /charges/charge-notification-preview/{id}` — pobranie PDF do wydruku
  - `POST /charges/charge-notification/{id}` — wysyłka email z PDF jako załącznik
  - `POST /charges/charge-notification-bulk` — masowa wysyłka do wielu lokali
  - `GET/PATCH /charges/zawiadomienie-config` — edycja tekstu podstawy prawnej (admin)
- Admin wybiera "Od miesiąca" (MM.YYYY) — system szuka aktywnych stawek na ten miesiąc
- Tekst podstawy prawnej edytowalny w panelu admina (przechowywany w `system_settings`)
- Frontend: trzecia zakładka "Zawiadomienia" w panelu Naliczenia (ChargesPage) — tabela lokali z obliczoną opłatą, przyciski Pobierz PDF / Wyślij email, tryb masowej wysyłki
- `api.ts` — nowa metoda `getBlob()` do pobierania plików binarnych
- Nowy model: `ChargeNotificationBulkIn` (z `valid_from`)
- Migracja 014: klucz `zawiadomienie_legal_basis` w `system_settings`
- Testy: 23 nowe (5 PDF + 18 endpointów); łącznie backend: **180** testów pytest

### 2026-03-25 — Audyt XSS/injection
- `escapeHtml()` w eksporcie PDF uchwał — escape `& < > " '` w tytule, opisie, imieniu i numerze lokalu
- Security headers w `vercel.json`: CSP (`script-src 'self'`, `frame-ancestors 'none'`), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- Test XSS: weryfikacja escape'owania `<script>`, `<img onerror>`, `<a>` w danych PDF
- Wynik audytu: brak `dangerouslySetInnerHTML`, React auto-escape, Supabase parametryzowane zapytania (brak SQL injection), Pydantic walidacja

### 2026-03-24 — Masowa wysyłka powiadomień o saldzie
- Nowy endpoint `POST /charges/balance-notification-bulk` — wysyłka PDF salda do wielu lokali jednym requestem
- Refaktor: logika wysyłki wyekstrahowana do helpera `_send_balance_notification_for_apartment()` (reużywana przez oba endpointy)
- Frontend: tryb bulk w panelu Lokale — checkboxy, "zaznacz wszystkie", sticky pasek akcji
- Lokale bez adresu email: disabled checkbox + oznaczenie wizualne, ostrzeżenie w pasku
- Wyniki wysyłki: panel z listą sukcesów/błędów + przycisk "Ponów dla błędów"
- Nowe modele Pydantic: `BulkNotificationIn`, `BulkNotificationFailedItem`, `BulkNotificationOut`
- Testy: 9 nowych testów (`test_balance_notification_bulk.py`); łącznie backend: **155** testów pytest

### 2026-03-24 — Powiadomienie e-mail o saldzie = PDF jako załącznik
- Saldo wysyłane jako plik PDF (załącznik) zamiast plain text w treści maila
- `api/core/saldo_pdf.py` — generowanie PDF (ReportLab + DejaVu Sans z pełną obsługą polskich znaków)
- `api/assets/fonts/` — czcionki DejaVu w repozytorium (działają na Vercel/Linux)
- `api/assets/logo.png` — logo wspólnoty dołączone do nagłówka PDF
- Treść maila: „Dzień dobry. Aktualne saldo w załączonym pliku."
- Edge Function `send-email` rozszerzona o opcjonalne `attachment_base64` + `attachment_filename` (backward compatible)
- Testy: `api/tests/test_saldo_pdf.py` (4 testy); łącznie backend: **146** testów pytest

### 2026-03-24 — Powiadomienie e-mail o saldzie = treść pisma SALDO
- `POST /charges/balance-notification/:id` wysyła ten sam tekst co wydruk (nagłówek, SALDO, kwota, termin +14 / nadpłata, konto) — moduł `api/core/saldo_letter.py`
- Zależność `tzdata` w `api/requirements.txt` — na Windowsie (i bez systemowej bazy IANA) `ZoneInfo("Europe/Warsaw")` wymaga tego pakietu
- Testy: `api/tests/test_saldo_letter.py`; łącznie backend: **142** testy pytest

### 2026-03-24 — Wydruk salda (admin / Lokale)
- Pismo „SALDO”: nagłówek z logo i adresem, kwota salda, przy długu termin +14 dni, przy nadpłacie tekst o odliczeniu, dane konta bankowego (`mockData.saldoPrintCopy` + `communityInfo.bankAccountFormatted`)
- Jedna strona w druku: treść w `createPortal(..., document.body)` + `body.saldo-printing` ukrywa `#root` przy druku (uniknięcie pustych stron z ukrytej tabeli lokali)
- Usunięto z wydruku: tabela szczegółów, właściciel, „Wygenerowano”, dopisek o liczeniu terminu od daty wystawienia

### 2026-03-24 — Votes DELETE policy + contact rate limiting
- RLS policy `votes_delete_admin` — admin może usuwać głosy (migracja 012)
- Nowy endpoint `DELETE /api/resolutions/:id/votes` — reset głosów uchwały (admin only)
- UI: przycisk „Resetuj głosy" z podwójnym potwierdzeniem + wymóg wpisania "USUŃ"
- ConfirmDialog: nowa opcja `requireText` — input blokujący przycisk potwierdzenia
- Rate limiting contact_messages: max 5/godz per email (RLS policy + FastAPI, HTTP 429)
- 12 nowych testów: reset głosów (4), kontakt + rate limit (5), izolacja RLS (3)
- Łącznie: 137 testów backend + 71 frontend, wszystkie przechodzą

### 2026-03-23 — Testy bezpieczeństwa RLS + roadmapa hardening
- 48 nowych testów izolacji danych (`test_rls_isolation.py`): auth, role, privilege escalation, data isolation
- Audyt wszystkich 11 migracji SQL — RLS policies na 14 tabelach zweryfikowane
- Znalezione uwagi: brak admin DELETE na votes, publiczny INSERT na contact_messages (spam risk)
- Roadmapa: dodana faza hardening (pentest, CI/CD, E2E, backup) + faza komercjalizacji (SaaS multi-tenant)
- Nowa zasada: dokumentacja operacyjna (deploy, utrzymanie, procedury awaryjne)
- Łącznie: 125 testów backend (77 istniejących + 48 nowych), wszystkie przechodzą

### 2026-03-23 — Regeneracja naliczeń, data salda, UX
- Regeneracja naliczeń: opcja „Aktualizuj" zamiast blokady 409 — parametr `force` usuwa istniejące auto-naliczenia i generuje nowe
- Data salda początkowego: nowe pole `initial_balance_date` w tabeli `apartments` (migracja 011)
- Ostrzeżenie przy generowaniu naliczeń za miesiąc objęty saldem początkowym (ochrona przed podwójnym naliczeniem)
- Hurtowe ustawianie daty salda dla wszystkich lokali bez daty (baner + formularz)
- Sumy per typ w naliczeniach: eksploatacja / fundusz remontowy / śmieci obok sumy zbiorczej
- Fix: synchronizacja `owner_resident_id` przy tworzeniu i usuwaniu mieszkańca
- Fix: wyświetlanie salda 0.00 zł (wcześniej pokazywało „—")
- Fix: precyzja float w udziałach (6.3100000000000005 → 6.31)
- UX: auto-scroll do formularza edycji przy kliknięciu Edytuj (lokale + mieszkańcy)
- Testy: 4 nowe backend (regeneracja, ostrzeżenie daty salda)

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
