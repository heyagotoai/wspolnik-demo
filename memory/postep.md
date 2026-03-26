# Postęp projektu WM GABI (skrót)

Ostatnia aktualizacja: **2026-03-26**.

## Zrobione niedawno
- **Repo wspolnik-demo** — tryb demonstracyjny: `site/src/demo/` (mock API, Supabase, seed), `isDemoApp()` + `VITE_PUBLIC_DEMO_ROUTES`, assety `demo-logo` / `demo-hero`, dane fikcyjne wspólnoty w `mockData.communityInfo`, dokumentacja `docs/roadmap-demo.md` i `docs/operations/demo-wdrozenie-wspolnik.md`.
- **Wydruk salda** (`/admin/lokale`): pismo jednostronicowe — saldo, warunkowo termin +14 dni / nadpłata, konto bankowe; portal do `document.body` + ukrycie `#root` przy druku (`body.saldo-printing`), żeby uniknąć wielu pustych stron od ukrytej listy lokali.
- **E-mail o saldzie** (`POST /charges/balance-notification/:id`): ta sama treść co wydruk — `api/core/saldo_letter.py` (przy zmianie tekstów zsynchronizuj z `mockData.ts` i `ApartmentsPage`). Backend: `tzdata` w `requirements.txt` (Windows + `Europe/Warsaw`).
- Teksty i numer konta (frontend): `site/src/data/mockData.ts` (`saldoPrintCopy`, `communityInfo`).

## W toku / znane luki
- Import wyciągów bankowych — format pliku do ustalenia (ADR / produkt).
- Ewentualne dopracowanie wydruku (marginesy, logo w `public/logo.png`).

Powiązane: `CHANGELOG.md`, `docs/architecture/feature-map.md`, `docs/instrukcja-admina.md`.
