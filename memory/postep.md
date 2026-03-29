# Postęp projektu WM GABI (skrót)

Ostatnia aktualizacja: **2026-03-29**.

## Zrobione niedawno
- **Głosy z zebrania (uchwały, 2026-03-29)** — przed publikacją uchwały admin rejestruje w panelu głosy oddane osobiście na zebraniu (`POST /api/resolutions/:id/votes/register`, `DELETE .../votes/:resident_id` w szkicu); `UNIQUE` blokuje drugi głos online; UI `/admin/uchwaly` — „Głosy z zebrania”, PDF dla szkicu z głosami; **pasek akcji:** ikona PDF w grupie z resetem / edycją / usunięciem (ADR-010, CHANGELOG). Zsynchronizowane: `feature-map.md` (roadmapa + uzupełnienie), `system-overview.md`, `KARTA_PRODUKTU.md`, ADR-002/010, pentest-doc, `operations/02`, `instrukcja-admina.md`.
- **UI panelu (2026-03-29)** — sidebary `ResidentLayout` / `AdminLayout`: sticky `h-screen`, linki profil/wyloguj zaraz pod menu (bez zjeżdżania przy długiej treści). Finanse: kolejność naliczeń; historia wpłat bez znaczników importu dla mieszkańca; `paymentDisplay` + modal wpłat w Lokale (admin/zarządca). Ogłoszenia: link z tytułu „Nowe głosowanie” do `#resolution-{id}` + scroll w Głosowania; `votingAnnouncement.ts`.
- **UX / frontend (2026-03-29)** — saldo: `roundMoney2` (brak „-0,00 zł” z floatów); `userFacingErrors` + spójne importy; klient `api.ts`: retry po 401 z deduplikacją odświeżenia sesji.
- **Głosowanie nad uchwałami (2026-03-29)** — wyniki API z wagami udziałów (`apartments.share`, właściciel lokalu); uprawnienia: `voting_eligibility` (mieszkaniec; admin/zarządca tylko jako właściciel lokalu); `can_vote_resolutions` w profilu; UI `voteResultsDisplay.ts` (fallback % gdy brak wag); PDF z dwoma trybami. ADR-010, CHANGELOG.
- **Grupy rozliczeniowe** — migracja 018, `/api/billing-groups`, panel `/admin/grupy-rozliczeniowe`, RLS przez `my_apartment_ids()`, Finanse/Dashboard z saldem łącznym i zakładkami per-lokal. ADR-013.
- **Import stanu początkowego (Excel)** — `/api/import`, dopasowanie pełnego numeru lokalu (zbiorcze) lub wielu numerów w komórce; modal `ImportInitialStateModal`, `openpyxl`. Odrębne od importu wyciągów bankowych.
- **Import wpłat z Excela** — `/api/import/payments`, `/payments-template`; kolumny Lokal / Data wpłaty / Kwota; wiele dat i kwot po średniku; deduplikacja `(lokal, data)` względem bazy i w obrębie pliku (ADR-014); `ImportPaymentsModal` w Lokale; `payment_split.py` wspólne z rozbiciem grupowym.
- **Import zestawienia bankowego (.xls)** — `POST /api/import/payments-bank-statement`, `xlrd`, `billing_surname`, parser `bank_statement_parser.py`, modal w Lokale; deduplikacja jak Excel (ADR-014).
- **Rola zarządcy (manager)** — migracja 017, read-only + ogłoszenia/terminy; wcześniejsza sesja (changelog).

## W toku / znane luki
- Import **MT940** (lub inny format poza `.xls`) — opcjonalnie, gdy bank udostępni inny eksport.
- Ewentualne dopracowanie wydruku salda (marginesy, logo w `public/logo.png`).

Powiązane: `CHANGELOG.md`, `docs/architecture/feature-map.md`, `docs/decisions/` (m.in. ADR-010, ADR-002, ADR-014), `docs/instrukcja-admina.md`, `docs/KARTA_PRODUKTU.md`, `docs/operations/02-utrzymanie.md`, `CLAUDE.md`, `.cursorrules`.

**Zależności:** `api/requirements.txt` — same `==`; `site/package.json` — wersje bez `^` (reprodukowalne buildy). `npm ci` w `site/` po klonowaniu.

## Środowisko (Windows)
- **Python:** venv w `D:\_AI\gabi_site\.venv` — interpreter `D:\_AI\gabi_site\.venv\Scripts\python.exe` (pytest/uvicorn z tego środowiska, jeśli `python` nie jest w PATH).
