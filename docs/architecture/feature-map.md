# Mapa Funkcjonalności — WM Gabi

## Strona publiczna (bez logowania)
| Strona | Route | Opis |
|--------|-------|------|
| Strona główna | `/` | Hero, karty szybkiego dostępu, ostatnie ogłoszenia |
| Aktualności | `/aktualnosci` | Przypięte + zwykłe ogłoszenia, ważne daty |
| Dokumenty | `/dokumenty` | Publiczne dokumenty z filtrowaniem kategorii |
| Kontakt | `/kontakt` | Formularz, dane kontaktowe, numery alarmowe |

## Panel mieszkańca (wymaga logowania → [[ADR-003-auth-pattern|ProtectedRoute]])
| Strona | Route | Dane z Supabase |
|--------|-------|-----------------|
| Dashboard | `/panel` | Statystyki, ostatnie ogłoszenia, nadchodzące daty |
| Ogłoszenia | `/panel/ogloszenia` | Pełna lista z rozwijaniem treści; badge "Nowe" (localStorage); krótkie → przeczytane od razu, długie → po rozwinięciu; tytuły typu „Nowe głosowanie: …” (auto z API uchwał) → **link** do `/panel/glosowania#resolution-{id}` z przewinięciem do uchwały |
| Dokumenty | `/panel/dokumenty` | Download z Supabase Storage |
| Terminy | `/panel/terminy` | Nadchodzące daty z odliczaniem + terminy głosowań (nieodgłosowane uchwały), wyróżnione wizualnie |
| Finanse | `/panel/finanse` | Saldo (łączne przy wielu lokalach / grupie rozliczeniowej), naliczenia (kolejność typów: eksploatacja → fundusz → śmieci), historia wpłat (ujednolicony „Wpłata z dnia” bez znaczników źródła dla mieszkańca); zakładki per-lokal; lookup przez `my_apartment_ids` (właściciel + grupa rozliczeniowa); wyświetlanie salda z zaokrągleniem do groszy (`roundMoney2`) — bez artefaktu „-0,00 zł” z floatów |
| Głosowania | `/panel/glosowania` | Lista uchwał (voting/closed), oddawanie głosów (wg `can_vote_resolutions` z `/profile`), wyniki: udziały (`apartments.share` + właściciel) lub fallback % wg liczby głosów — [[ADR-010-voting-system]]; wejście z ogłoszenia/pulpitu z hashem `#resolution-{id}` przewija do karty uchwały |
| Profil | `/panel/profil` | Dane mieszkańca, zmiana hasła |

## Panel administratora / zarządcy (wymaga roli **admin** lub **manager** → [[ADR-003-auth-pattern|AdminRoute]])

**Uwaga:** Ten sam zestaw tras `/admin/*`; szczegółowe operacje zależą od roli. **Administrator** — pełny CRUD tam, gdzie w opisie nie ma ograniczenia. **Zarządca (`manager`)** — zgodnie z [[CLAUDE.md]]: podgląd read-only (m.in. finanse, mieszkańcy, dokumenty, uchwały, wiadomości, audit), pełny CRUD **ogłoszeń** i **terminów**; bez m.in. CRUD mieszkańców, stawek, generowania naliczeń, importów, wysyłki e-mail z naliczeń.

| Strona | Route | Operacje |
|--------|-------|----------|
| Dashboard | `/admin` | Statystyki: mieszkańcy, lokale, ogłoszenia, dokumenty |
| Mieszkańcy | `/admin/mieszkancy` | CRUD przez [[FastAPI]] (tworzenie/usuwanie) + Supabase (edycja). Auto-sync owner_resident_id przy tworzeniu/usuwaniu. Auto-scroll do formularza edycji |
| Lokale | `/admin/lokale` | CRUD lokali: numer, m², udział, mieszkańcy, saldo początkowe + data salda, **saldo bieżące** z zaokrągleniem do groszy (bez „-0,00 zł”), przypisanie właściciela, opcjonalna grupa rozliczeniowa (badge), pole **nazwisko rozliczeniowe** (`billing_surname`) pod import bankowy. **Podgląd wpłat lokalu** (modal z listą wpłat, sumy vs tabela — admin i zarządca). Hurtowe ustawianie daty salda. **Import stanu z Excel** (`GET/POST /api/import`, szablon, dry-run): dopasowanie pełnego numeru (lokale zbiorcze np. `3,4A`) lub wiele lokali w jednej komórce; walidacja wierszy. **Import wpłat z Excel** (`GET /payments-template`, `POST /payments`): arkusz Dopasowania — Lokal, Data wpłaty, Kwota (inne kolumny ignorowane); wpłata zbiorcza = parent + rozbicie; **deduplikacja** `(lokal, data)` względem bazy i w obrębie pliku — [[ADR-014-payment-import-deduplication|ADR-014]]. **Import z banku (.xls)** (`POST /payments-bank-statement`): zestawienie bankowe, dopasowanie po nazwisku rozliczeniowym i numerze z opisu; ta sama deduplikacja; modal `ImportBankStatementModal`. Wydruk salda (portal + `saldo-printing`, jedna strona). Wysyłka salda PDF emailem (załącznik z logo, krótki cover text). **Masowa wysyłka**: tryb bulk z checkboxami, "zaznacz wszystkie", ostrzeżenie o lokalach bez emaila, wyniki z opcją ponowienia błędów. Auto-scroll do formularza edycji |
| Ogłoszenia | `/admin/ogloszenia` | CRUD + przypinanie |
| Dokumenty | `/admin/dokumenty` | Upload PDF (max 10MB) + public/private toggle |
| Terminy | `/admin/terminy` | CRUD ręcznych terminów + automatyczne daty głosowań z uchwał (voting_start/voting_end), scalona lista sortowana malejąco, link do Uchwał |
| Naliczenia | `/admin/naliczenia` | Zakładki: Naliczenia (generowanie + regeneracja z force, ręczne) / Stawki (CRUD z wersjonowaniem) / **Zawiadomienia** (PDF + email: jednostkowy i masowy, edycja podstawy prawnej, wybór miesiąca obowiązywania). Wzory: eksploatacja/fundusz = m² × stawka, śmieci = osoby × stawka. Sumy per typ + zbiorcza. Ostrzeżenie przy generowaniu za miesiąc objęty saldem początkowym |
| Grupy rozliczeniowe | `/admin/grupy-rozliczeniowe` | CRUD grup, przypisywanie lokali, rejestracja wpłat grupowych z auto-rozbiciem, podgląd salda łącznego (admin; backend `/api/billing-groups`) |
| Uchwały | `/admin/uchwaly` | CRUD uchwał, workflow statusów (draft→voting→closed), **głosy z zebrania** (modal przy szkicu — rejestracja głosów osobistych przed publikacją; API `POST /resolutions/:id/votes/register`, korekta `DELETE .../votes/:resident_id` tylko w szkicu, tylko **admin**), wyniki (agregacja wg udziałów + fallback w UI/PDF), eksport PDF także dla szkicu z głosami; **pasek akcji:** „Głosy z zebrania” → ikony (reset głosów, PDF, edycja, usuń) — [[ADR-010-voting-system]] |
| Wiadomości | `/admin/wiadomosci` | Podgląd wiadomości kontaktowych, oznaczanie jako przeczytane |

## Roadmapa — przed produkcją

### Faza: Hardening (wymagane przed wdrożeniem)
| Zadanie | Status | Priorytet | Opis |
|---------|--------|-----------|------|
| Testy izolacji RLS (FastAPI) | ✅ done | KRYTYCZNY | 55 testów: auth, role, izolacja danych, privilege escalation, reset głosów |
| Pentest RLS na żywej bazie | ✅ done | KRYTYCZNY | 2026-03-27: 19/19 testów zaliczonych. RLS, IDOR, autentykacja, XSS, Storage — brak luk. Raport: `docs/security/pentest-2026-03-27.md` |
| Pentest IDOR frontend | ✅ done | KRYTYCZNY | 2026-03-27: admin endpointy (5/5 → 403), głosowanie IDOR (resident_id z JWT), brak dangerouslySetInnerHTML — patrz raport |
| Audyt XSS/injection | ✅ done | KRYTYCZNY | escapeHtml() w PDF uchwał, CSP + security headers w vercel.json (2026-03-25) |
| Naprawa: votes DELETE policy | ✅ done | WYSOKI | RLS policy `votes_delete_admin` + endpoint `DELETE /resolutions/:id/votes` + UI z podwójnym potwierdzeniem (wymóg wpisania "USUŃ") |
| Naprawa: contact_messages spam | ✅ done | WYSOKI | Rate limiting: max 5 wiadomości/godz per email — RLS policy + FastAPI check, komunikat 429 |
| CI/CD pipeline | ✅ done | WYSOKI | GitHub Actions: npm test + pytest na push/PR do main (.github/workflows/ci.yml) |
| Testy E2E | ✅ done | WYSOKI | Playwright (Chromium): 13 testów — logowanie (4), głosowanie (4), finanse (5). Konta testowe: e2e_admin/e2e_resident@wmgabi.pl. `site/e2e/` |
| Testy obciążeniowe | ✅ done | ŚREDNI | Locust: 10 userów, prod (wmgabi.pl), 0 błędów aplikacji, median 460-630ms. `api/tests/load/locustfile.py` + `api/tests/test_concurrency.py` (4 testy race condition) |
| Backup & recovery | ✅ done | WYSOKI | Supabase auto-backup (7 dni) + tygodniowy cron backup do Storage (12 tyg. retencji): 9 tabel + auth.users + PDF-y. Email notification do adminów (OK/NIEUDANY). `POST /api/backup/cron` (niedziela 2:00 UTC). `docs/operations/02-utrzymanie.md` + `03-procedury-awaryjne.md` |

### Faza: Dokumentacja operacyjna
| Zadanie | Status | Priorytet | Opis |
|---------|--------|-----------|------|
| Instrukcja wdrożeniowa | ✅ done | WYSOKI | `docs/operations/01-wdrozenie.md` — Supabase, Vercel, DNS, env vars, migracje |
| Instrukcja utrzymania | ✅ done | WYSOKI | `docs/operations/02-utrzymanie.md` — monitoring, debugowanie, backup, cron, limity |
| Instrukcja dla admina | ✅ done | ŚREDNI | `docs/instrukcja-admina.md` — obsługa panelu (Lokale, importy Excel/.xls, deduplikacja, grupy, naliczenia itd.) |
| Procedury awaryjne | ✅ done | ŚREDNI | `docs/operations/03-procedury-awaryjne.md` — awarie, rollback, utrata danych |

### Faza: Brakujące funkcjonalności
| Zadanie | Status | Priorytet | Opis |
|---------|--------|-----------|------|
| SMTP email | ✅ done | WYSOKI | Edge Function send-email działa, SMTP az.pl skonfigurowany, test wysyłki potwierdzony (2026-03-24) |
| Import z zestawienia bankowego (.xls) | ✅ done | WYSOKI | `POST /api/import/payments-bank-statement`; dopasowanie po `billing_surname` i numerach lokali z opisu/adresu; deduplikacja `(lokal, data)` — [[ADR-014-payment-import-deduplication|ADR-014]]; parser: `api/services/bank_statement_parser.py` |
| Import bankowy (MT940) | ⏸ czeka | ŚREDNI | Czeka na format eksportu z banku (opcjonalnie, jeśli .xls nie wystarczy) |
| Import Excel — saldo / stan początkowy lokali | ✅ done | WYSOKI | Szablon + upload z panelu Lokale; `GET/POST /api/import/*`; nie zastępuje importu wyciągów bankowych |
| Import Excel — wpłaty (dopasowania) | ✅ done | WYSOKI | `GET/POST /api/import/payments*`; Lokal, Data wpłaty, Kwota; wiele dat/kwot po `;`; deduplikacja `(lokal, data)` jak w imporcie bankowym — [[ADR-014-payment-import-deduplication|ADR-014]] |
| Audit log | ✅ done | WYSOKI | Triggery PostgreSQL na charges, payments, charge_rates, apartments, bank_statements (migracja 013) |
| Retencja danych | ⬜ todo | ŚREDNI | Automatyczne usuwanie danych finansowych >5 lat |

### Faza: Komercjalizacja (po wdrożeniu u siebie)
| Zadanie | Status | Priorytet | Opis |
|---------|--------|-----------|------|
| Plan sprzedaży SaaS | ⬜ todo | ŚREDNI | Strategia multi-tenant: izolacja danych, onboarding, pricing, kanały dotarcia |
| Multi-tenancy | ⬜ todo | ŚREDNI | Architektura wielu wspólnot: osobne schematy / tenant_id / osobne projekty Supabase |
| Wielu mieszkańców na lokal | ⬜ todo | ŚREDNI | Współwłaściciele: kilku mieszkańców przypisanych do jednego lokalu (wymaga zmiany my_apartment_ids() i RLS) |
| Rola zarządcy | ✅ done | WYSOKI | Rola "manager": podgląd read-only (finanse, mieszkańcy, dokumenty, uchwały, wiadomości, audit log), pełny CRUD ogłoszeń i terminów. Migracja 017, RLS policies, FastAPI guards, React conditional UI. |
| Landing page B2B | ⬜ todo | NISKI | Strona sprzedażowa dla zarządców wspólnot |
| Demo / trial | ⬜ todo | NISKI | Środowisko demo z przykładowymi danymi |
| Regulamin i umowa SaaS | ⬜ todo | ŚREDNI | Dokumenty prawne: umowa, SLA, przetwarzanie danych (RODO) |

### Uzupełnienie roadmapy (2026-03-29)
- **Uchwały — głosy z zebrania** — wdrożone (API + panel admina + dokumentacja); brak odrębnego wiersza w tabeli „Brakujące funkcjonalności”, bo funkcja wynika z bieżącej obsługi uchwał — źródło prawdy: [[ADR-010-voting-system]].

## Powiązania
- [[ADR-004-data-access-pattern]] — kiedy frontend vs backend
- [[ADR-002-rls-bezpieczenstwo]] — kto co widzi
- [[ADR-010-voting-system]] — system głosowania nad uchwałami
- [[ADR-012-charge-generation]] — automatyczne generowanie naliczeń
- [[ADR-013-billing-groups]] — grupy rozliczeniowe
- [[ADR-014-payment-import-deduplication]] — deduplikacja importów wpłat (Excel + bank)
- [[system-overview]] — architektura techniczna
