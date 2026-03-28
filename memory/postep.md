# Postęp projektu WM GABI (skrót)

Ostatnia aktualizacja: **2026-03-28**.

## Zrobione niedawno
- **Grupy rozliczeniowe** — migracja 018, `/api/billing-groups`, panel `/admin/grupy-rozliczeniowe`, RLS przez `my_apartment_ids()`, Finanse/Dashboard z saldem łącznym i zakładkami per-lokal. ADR-013.
- **Import stanu początkowego (Excel)** — `/api/import`, dopasowanie pełnego numeru lokalu (zbiorcze) lub wielu numerów w komórce; modal `ImportInitialStateModal`, `openpyxl`. Odrębne od importu wyciągów bankowych.
- **Rola zarządcy (manager)** — migracja 017, read-only + ogłoszenia/terminy; wcześniejsza sesja (changelog).

## W toku / znane luki
- Import wyciągów bankowych (MT940 lub inny format) — do ustalenia z bankiem.
- Ewentualne dopracowanie wydruku salda (marginesy, logo w `public/logo.png`).

Powiązane: `CHANGELOG.md`, `docs/architecture/feature-map.md`, `docs/instrukcja-admina.md`.

## Środowisko (Windows)
- **Python:** venv w `D:\_AI\gabi_site\.venv` — interpreter `D:\_AI\gabi_site\.venv\Scripts\python.exe` (pytest/uvicorn z tego środowiska, jeśli `python` nie jest w PATH).
