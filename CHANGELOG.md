# Changelog — WM Gabi

## [Faza 1] — Fundament (w trakcie)

### 2026-04-17 — Jeden właściciel, wiele lokali: zarządzanie + rozbicie finansów + głosowania
- **`api/routes/residents.py`** — `POST /residents/{id}/apartments` (przypisanie lokalu do istniejącego właściciela) + `DELETE /residents/{id}/apartments/{apartment_id}` (odpięcie); walidacja 404/409
- **`api/models/schemas.py`** — nowy `ApartmentAssign`; `VoteDetail` rozszerzony o `apartments_count: int` + `share: float`
- **`api/routes/resolutions.py`** — `GET /:id/votes`: każdy głos wzbogacony o liczbę lokali właściciela, sumę udziałów (`apartments.share`) i listę numerów lokali (pole `apartment_number` = "32, 45" dla wielolokalowców)
- **`site/src/pages/admin/ResidentsPage.tsx`** — modal „Zarządzaj lokalami" (ikona 🏠 przy wierszu): lista przypisanych lokali z przyciskiem „Odepnij" + dropdown wolnych lokali → „Przypisz"; kolumna „Lokal" pokazuje wszystkie lokale właściciela
- **`site/src/pages/resident/FinancesPage.tsx`** — rozbicie per lokal (tabela Naliczenia / Wpłaty / Saldo) wyświetlane zawsze przy > 1 lokalu (dotychczas tylko przy grupie rozliczeniowej)
- **`site/src/pages/admin/ResolutionsPage.tsx`** — lista głosów (UI + PDF): kolumna „Udział", format „lokale 32, 45 (2)" dla wielolokalowców; dropdown „Dodaj głos" pokazuje wszystkie lokale właściciela pobrane z `apartments.owner_resident_id`

### 2026-04-14 — Bezpieczeństwo sesji: stabilna referencja user + auto-wylogowanie po bezczynności
- **`site/src/hooks/useAuth.ts`** — `onAuthStateChange`: zachowuje stabilną referencję `user` gdy `id` się nie zmienił (fix: `TOKEN_REFRESHED` nie powoduje już odmontowania widoków i utraty stanu formularzy)
- **`site/src/hooks/useIdleLogout.ts`** — nowy hook: timer bezczynności niezależny od widoczności karty (karta w tle wygasa tak samo jak aktywna); aktywność (`mousemove/mousedown/keydown/touchstart/scroll`) resetuje timer; w trakcie ostrzeżenia wymagany jawny klik; zwraca `{ warning, remainingSec, extend }`
- **`site/src/components/auth/IdleWarningDialog.tsx`** — modal ostrzeżenia z odliczaniem sekund i przyciskiem „Zostaję — przedłuż sesję"
- **`site/src/components/auth/AdminRoute.tsx`** — auto-wylogowanie po **15 min** bezczynności + ostrzeżenie przez ostatnie **60 s**
- **`site/src/components/auth/ProtectedRoute.tsx`** — auto-wylogowanie po **30 min** bezczynności (bez ostrzeżenia)

### 2026-04-05 — Dokumentacja: `KARTA_PRODUKTU` / `KARTA_PRODUKTU_OFERTA` zsynchronizowane z aplikacją
- **Role:** doprecyzowanie **zarządcy** (read-only + CRUD ogłoszeń/terminów; bez naliczeń, importów, salda, zawiadomień o opłatach)
- **Panel:** wspólne URL admin/zarządca; **Lokale** — `billing_surname`, podgląd wpłat, ostatnie importy; **Naliczenia** — zawiadomienia o opłatach (PDF, e‑mail, masowo); saldo — **masowa** wysyłka
- **Powiadomienia:** zawiadomienia o opłatach, e‑mail po tygodniowym backupie
- **Niefunkcjonalne / bezpieczeństwo:** backup tygodniowy do magazynu plików + retencja plików (~12 tyg.), retencja finansów 5 lat jako proces zautomatyzowany
- **Oferta:** Wariant B — dopisanie zawiadomień o opłatach, zarządcy, backupu

### 2026-04-04 — Strona publiczna: aktualności z bazy, jawność ogłoszeń, nawigacja
- **Migracje `021_announcements_is_public.sql`**, **`022_announcements_is_public_default_false.sql`** — kolumna `is_public`, RLS: anon widzi tylko jawne wpisy; zalogowany — pełna lista w panelu; domyślna wartość `false` dla nowych wierszy bez jawnej wartości
- **`site/src/lib/loadPublicAnnouncements.ts`** — pobieranie + deduplikacja auto-ogłoszeń głosowań; **`announcementPreview`**; testy
- **`site/src/pages/HomePage.tsx`**, **`NewsPage.tsx`** — treść z Supabase (zamiast mocków); hero: przyciski logowanie / aktualności / kontakt; usunięty podtytuł na `/aktualnosci`; usunięty sidebar „Ważne terminy”; **`TextWithAutoLinks`** — klikalne `http(s)://` w podglądzie
- **`site/src/pages/admin/AnnouncementsPage.tsx`** — checkbox „Aktualności - widoczne na stronie głównej bez logowania” (`is_public`), badge „Tylko panel”
- **`api/routes/resolutions.py`** — insert auto-ogłoszenia głosowania z `is_public: false`
- **`Header.tsx`**, **`Footer.tsx`** — link „Dokumenty” w menu tylko po zalogowaniu
- **`mockData.ts`** — usunięte nieużywane mocki ogłoszeń/terminów
- **Dokumentacja:** [[ADR-016-public-announcements-visibility]], `feature-map.md`, `KARTA_PRODUKTU.md`, `KARTA_PRODUKTU_OFERTA.md`, `docs/operations/01-wdrozenie.md`, `memory/postep.md`, **CLAUDE.md** / **.cursorrules** (migracje 021–022)

### 2026-04-04 — Lokale: „Ostatnie importy wpłat” (admin i zarządca)
- **`site/src/pages/admin/ApartmentsPage.tsx`** — panel z datą ostatniego importu z zestawienia bankowego (`.xls`), ostatniego importu wpłat z Excela (arkusz Dopasowań) oraz najpóźniejszą **zaksięgowaną** datą wpłaty (`confirmed_by_admin`) z **lokalem** (lub wpłatą zbiorczą) i **kwotą** (sort: `payment_date` ↓, `created_at` ↓); identyfikacja importów po tytułach wpłat zgodnych z `api/routes/import_routes.py`
- **`docs/instrukcja-admina.md`**, **`docs/architecture/feature-map.md`**
- Panel **Ostatnie importy wpłat** — zwijany (domyślnie zwinięty), nagłówek z chevronem, `aria-expanded` / `aria-controls`

### 2026-04-04 — Crony przeniesione z Vercel do GitHub Actions + retencja danych finansowych
- **`.github/workflows/cron.yml`** — 4 zadania: naliczenia (06:00 UTC), backup (niedziela 02:00 UTC), retencja wiadomości (1. dzień miesiąca 03:00 UTC), retencja finansowa (1. dzień kwartału 04:00 UTC); `workflow_dispatch` — ręczne uruchomienie z UI GitHub
- **`POST/GET /api/retention/cron`** — kwartalny cron RODO: carry-forward salda (przeniesienie efektu starych naliczeń/wpłat do `initial_balance` przed usunięciem), usuwanie z `charges`, `payments`, `bank_statements` (fallback `created_at` przy NULL `statement_date`), `audit_log` starszych niż 5 lat; powiadomienia email do adminów/zarządców
- **`vercel.json`** — usunięte crony (limit 2 na darmowym planie Vercel)
- Przywrócony cron retencji wiadomości kontaktowych (`/api/contact/cron`) — usunięty wcześniej z powodu limitu Vercel
- Testy: `api/tests/test_retention.py` (11 testów); `conftest.py` — dodano `lt()` do FakeSupabaseBuilder

### 2026-04-03 — Dokumentacja: obowiązek podbijania wersji przy zmianie PDF regulaminu/polityki
- **`docs/operations/02-utrzymanie.md`** — sekcja *Zmiana polityki prywatności lub regulaminu* (checklist: env `CURRENT_*_VERSION`, redeploy API); odesłania w **`01-wdrozenie.md`** i **ADR-015**

### 2026-04-03 — RODO: zgody polityki prywatności i regulaminu przy wejściu do portalu
- **Migracja `020_residents_legal_consent.sql`:** kolumny `privacy_accepted_at`, `terms_accepted_at`, `privacy_version`, `terms_version` w `residents`
- **Backend:** `GET /api/profile` rozszerzone o `needs_legal_acceptance`, `current_*_version`, zapisane wersje i timestampy; **`POST /api/profile/legal-consent`**; **`CURRENT_PRIVACY_VERSION`** / **`CURRENT_TERMS_VERSION`** w `api/core/config.py` (env)
- **Frontend:** `LegalConsentGate` w `ProtectedRoute` i `AdminRoute` (modal z checkboxami + linki do PDF); profil — sekcja dokumentów prawnych i kanał kontaktu; **Playwright:** `acceptLegalConsentIfShown()` w `login()`
- **Dokumentacja:** [[ADR-015-legal-consent-rodo]], `feature-map`, `docs/operations/01-wdrozenie.md`, karty produktu; testy: `test_profile.py`, `conftest` (deep copy + merge `update`), Vitest tras i profilu

### 2026-03-29 — Uchwały: głosy z zebrania przed publikacją
- **`POST /api/resolutions/:id/votes/register`** (admin, tylko `status=draft`) — rejestracja głosu mieszkańca oddanego osobiście na zebraniu; te same reguły co `POST /vote` (`voting_eligibility`); **`DELETE /api/resolutions/:id/votes/:resident_id`** — pojedyncze usunięcie w szkicu
- **Panel admina Uchwały** — przycisk „Głosy z zebrania” przy szkicu; podgląd wyników także dla szkicu z głosami; eksport PDF gdy są głosy
- **UI (ten sam dzień):** `ResolutionsPage` — ikona eksportu PDF przeniesiona do **jednej grupy** z resetem głosów, edycją i usunięciem (po przycisku „Głosy z zebrania”); opis w ADR-010
- **Dokumentacja (Obsidian + repo):** [[ADR-010-voting-system]], [[ADR-002-rls-bezpieczenstwo]] (edge case), `docs/architecture/feature-map.md` (mapa + uzupełnienie roadmapy), `docs/architecture/system-overview.md`, `docs/instrukcja-admina.md`, `docs/KARTA_PRODUKTU.md`, `docs/operations/02-utrzymanie.md`, `docs/security/pentest-2026-03-27.md` (uwaga o nowych endpointach), `memory/postep.md`, **CLAUDE.md** / **.cursorrules** — opis workflow i endpointów; testy: `api/tests/test_resolutions.py`, `ResolutionsPage.test.tsx`

### 2026-03-29 — UI: finanse, sidebary, ogłoszenia → uchwała, podgląd wpłat (Lokale)
- **Finanse mieszkańca** (`FinancesPage`) — stała kolejność wierszy „Naliczenia miesięczne”: Eksploatacja → Fundusz remontowy → Śmieci; historia wpłat: ujednolicony tytuł „Wpłata z dnia” **bez** znaczników źródła importu (bank/arkusz/podział) — tylko tekst + data + kwota
- **`site/src/lib/paymentDisplay.ts`** — etykiety dla wpłat (Z banku / Z arkusza / Podział + źródło z wpłaty nadrzędnej przy rozbiciu); użycie w **`ApartmentPaymentsModal`**; mieszkańiec nie renderuje znaczników
- **`ApartmentPaymentsModal`** — z panelu **Lokale** (`/admin/lokale`) dla **admin** i **zarządcy**: podgląd wpłat lokalu, suma vs kolumna salda, lista z tymi samymi etykietami co weryfikacja
- **`ResidentLayout`**, **`AdminLayout`** — pasek boczny `sticky top-0 h-screen shrink-0`; grupa „Panel mieszkańca / Wyloguj” (oraz odpowiednie w panelu admina) **bezpośrednio pod** linkami głównymi, z separatorem — nie „zjeżdża” na dół przy długiej treści strony
- **Ogłoszenia** (`/panel/ogloszenia`) — tytuły auto-tworzone przy starcie głosowania (`Nowe głosowanie: …`) jako link do **`/panel/glosowania#resolution-{id}`**; dopasowanie `resolution_id` po tytule uchwały z tabeli `resolutions`; **`ResolutionsPage`** — `id` na karcie uchwały + `scrollIntoView` przy haśle; **`votingAnnouncement.ts`** + testy; pulpit (`DashboardPage`) — ten sam link głęboki
- Testy: `paymentDisplay.test.ts`, `votingAnnouncement.test.ts`, `ResolutionsPage.test.tsx` owinięty w `MemoryRouter`

### 2026-03-29 — Saldo bez „-0,00 zł”; komunikaty błędów; klient API (401)
- **`site/src/lib/money.ts`** — `roundMoney2()` (zaokrąglenie do groszy); usuwa artefakty float przy sumowaniu salda (`initial + wpłaty − naliczenia`), które dawały **-0,00 zł** i czerwony kolor przy teoretycznym zerze — użycie w **Lokale** (`ApartmentsPage`), **Finanse**, **Dashboard**; test `money.test.ts`
- **`site/src/lib/userFacingErrors.ts`** — `formatCaughtError`, `mapSupabaseError` (sieć, duplicate key, FK, RLS, JWT); import z wielu stron i modali zamiast duplikatów; **`userFacingErrors.test.ts`**
- **`site/src/lib/api.ts`** — po **401**: deduplikacja `refreshSession()`, jedno ponowne żądanie (wygasły access token); testy w `api.test.ts`

### 2026-03-29 — Import z banku: kilka lokali w opisie; logowanie: błędy po polsku
- **`api/services/bank_statement_parser.py`** — ekstrakcja wielu numerów z opisu (`lokal nr 11,16`, `11 i 16` itd.); gdy trafienia należą do jednej grupy rozliczeniowej, ustawiane jest `group_records` (rozbicie wpłaty jak przy dopasowaniu po nazwisku); testy w `api/tests/test_bank_statement_parser.py`
- **`site/src/lib/authLoginErrors.ts`** — mapowanie komunikatów Supabase Auth na zrozumiałe teksty po polsku; **`LoginPage`** używa `getLoginErrorMessage`; testy jednostkowe modułu

### 2026-03-29 — Dokumentacja feature-map; zaostrzenie GET stawek i auto-config
- **`docs/architecture/feature-map.md`** — usunięty nieistniejący route `/o-nas`; sekcja panelu: **admin lub manager** (`AdminRoute`) + krótki opis różnic uprawnień
- **`GET /api/charges/rates`**, **`GET /api/charges/auto-config`** — tylko **admin** lub **manager** (`require_admin_or_manager`); mieszkaniec nie pobiera stawek ani konfiguracji auto-naliczeń przez API (backend ze `service_role`); **`PATCH /auto-config`** bez zmian (wyłącznie admin)
- **Testy:** `api/tests/test_charges.py`, `api/tests/test_rls_isolation.py`

### 2026-03-29 — Głosowanie: udziały, uprawnienia, UI wyników
- **`GET /api/resolutions/:id/results`** — agregacja **wag wg udziałów** (`apartments.share` × właściciel lokalu `owner_resident_id`); pola `share_*`, `total_share_community`; liczby głosów bez zmian
- **`api/core/voting_eligibility.py`** — kto może głosować: rola `resident` (konto aktywne); **admin** i **manager** tylko jeśli mają przypisany lokal jako właściciel w Lokale
- **`POST /api/resolutions/:id/vote`** — walidacja przez `check_resolution_vote_eligibility`
- **`GET/PATCH /api/profile`** — pole `can_vote_resolutions` (spójna reguła z głosowaniem)
- **Frontend:** `site/src/lib/voteResultsDisplay.ts` — pasek i procenty: **udziały** gdy są niezerowe wagi głosów; w przeciwnym razie **fallback na liczbę głosów** (uniknięcie „pustego” wykresu przy braku `owner_resident_id` u głosujących); PDF z trybem ważonym / wg głosów
- **Panel Głosowania** — równoległe ładowanie `/resolutions` + `/profile`; przyciski głosu wg `can_vote_resolutions`
- **Testy:** pytest (profile, głosowanie admin/właściciel, conftest: insert głosu z `id`/`voted_at`); vitest dopasowania tekstu wyników

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
