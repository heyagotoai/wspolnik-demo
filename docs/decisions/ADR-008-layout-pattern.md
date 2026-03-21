# ADR-008: Trzy layouty — Public, Resident, Admin

**Status:** Przyjęty
**Data:** 2026-03-21

## Kontekst
Aplikacja ma trzy grupy użytkowników z różnymi potrzebami nawigacyjnymi.

## Decyzja
Trzy osobne layouty z React Router `<Outlet>`:

| Layout | Użytkownik | Nawigacja |
|--------|-----------|-----------|
| `PageLayout` | Każdy (publiczny) | Header + Footer, 5 linków (Główna, O nas, Aktualności, Dokumenty, Kontakt) |
| `ResidentLayout` | Zalogowany mieszkaniec | Sidebar + TopBar, 5 linków (Pulpit, Ogłoszenia, Dokumenty, Terminy, Finanse) |
| `AdminLayout` | Admin | Sidebar + TopBar + badge "Admin", 6 linków (+ Mieszkańcy, Naliczenia) |

## Dlaczego
- Każda grupa ma **inny kontekst pracy** — publiczny przegląda info, mieszkaniec sprawdza swoje dane, admin zarządza
- Sidebar w panelach = stała nawigacja bez scrollowania (lepszy UX niż top nav)
- Responsive: sidebar ukryty na mobile → hamburger menu
- Admin widzi link do panelu mieszkańca (na dole sidebara), mieszkaniec widzi link do strony głównej

## Edge cases
- Header publiczny czyta dane z `mockData.ts` (nazwa wspólnoty, linki) — łatwa zmiana bez edycji komponentu
- Active route styling — podświetlenie aktualnej strony w nawigacji

## Powiązania
- [[ADR-003-auth-pattern]] — ProtectedRoute/AdminRoute decydują który layout
- [[ADR-005-ui-lokalizacja]] — Tailwind styling, polskie etykiety
