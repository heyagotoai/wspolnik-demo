# Postęp projektu WM GABI (skrót)

Ostatnia aktualizacja: **2026-03-28**.

## Zrobione niedawno
- **Grupy rozliczeniowe** — migracja 018, `/api/billing-groups`, panel `/admin/grupy-rozliczeniowe`, RLS przez `my_apartment_ids()`, Finanse/Dashboard z saldem łącznym i zakładkami per-lokal. ADR-013.
- **Import stanu początkowego (Excel)** — `/api/import`, dopasowanie pełnego numeru lokalu (zbiorcze) lub wielu numerów w komórce; modal `ImportInitialStateModal`, `openpyxl`. Odrębne od importu wyciągów bankowych.
- **Import wpłat z Excela** — `/api/import/payments`, `/payments-template`; kolumny Lokal / Data wpłaty / Kwota; wiele dat i kwot po średniku; deduplikacja `(lokal, data)` względem bazy i w obrębie pliku (ADR-014); `ImportPaymentsModal` w Lokale; `payment_split.py` wspólne z rozbiciem grupowym.
- **Import zestawienia bankowego (.xls)** — `POST /api/import/payments-bank-statement`, `xlrd`, `billing_surname`, parser `bank_statement_parser.py`, modal w Lokale; deduplikacja jak Excel (ADR-014).
- **Rola zarządcy (manager)** — migracja 017, read-only + ogłoszenia/terminy; wcześniejsza sesja (changelog).

## W toku / znane luki
- Import **MT940** (lub inny format poza `.xls`) — opcjonalnie, gdy bank udostępni inny eksport.
- Ewentualne dopracowanie wydruku salda (marginesy, logo w `public/logo.png`).

Powiązane: `CHANGELOG.md`, `docs/architecture/feature-map.md`, `docs/decisions/ADR-014-payment-import-deduplication.md`, `docs/instrukcja-admina.md`.

**Zależności:** `api/requirements.txt` — same `==`; `site/package.json` — wersje bez `^` (reprodukowalne buildy). `npm ci` w `site/` po klonowaniu.

## Środowisko (Windows)
- **Python:** venv w `D:\_AI\gabi_site\.venv` — interpreter `D:\_AI\gabi_site\.venv\Scripts\python.exe` (pytest/uvicorn z tego środowiska, jeśli `python` nie jest w PATH).
