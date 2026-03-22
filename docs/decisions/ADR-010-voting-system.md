# ADR-010: System głosowania nad uchwałami

## Status
Zaakceptowane (2026-03-21)

## Kontekst
Wspólnota mieszkaniowa potrzebuje mechanizmu cyfrowego głosowania nad uchwałami. Schemat bazy (`resolutions`, `votes`) i polityki [[RLS]] zostały przygotowane w migracji 001/002. Brakowało implementacji API i UI.

## Decyzja

### Workflow uchwał (statusy)
1. **draft** (szkic) — admin tworzy uchwałę, mieszkańcy jej nie widzą
2. **voting** (głosowanie) — mieszkańcy mogą oddać głos
3. **closed** (zamknięta) — głosowanie zakończone, wyniki widoczne

Admin ręcznie zmienia status. W przyszłości można dodać automatyczne zamykanie na podstawie `voting_end`.

### Głosowanie
- Opcje: **za**, **przeciw**, **wstrzymuję się**
- Głos jest **jednorazowy** — brak możliwości zmiany (brak UPDATE policy w [[RLS]])
- Constraint UNIQUE(resolution_id, resident_id) + walidacja w API
- Głos można oddać tylko gdy status = `voting`

### Architektura
- **Backend (FastAPI)**: pełny CRUD + endpoint głosowania (`POST /resolutions/:id/vote`)
- **Frontend**: admin zarządza przez panel CRUD, mieszkaniec głosuje przyciskami
- Wyniki: pasek proporcji + liczby (za/przeciw/wstrzymuje)
- Mieszkaniec widzi tylko swój głos (RLS `votes_select_own`), admin widzi wszystkie

### Bezpieczeństwo
- [[RLS]] zapewnia izolację głosów między mieszkańcami
- Brak DELETE/UPDATE policy na `votes` — głosy nieodwracalne
- Admin nie może głosować "za kogoś" — `resident_id = auth.uid()` w INSERT policy
- Wyniki agregowane przez API (admin widzi zbiorczy wynik, nie indywidualne głosy mieszkańców w UI)

## Alternatywy rozważane
- **Głosowanie z możliwością zmiany** — odrzucone; w kontekście uchwał wspólnoty głos powinien być świadomy i ostateczny
- **Automatyczne zamykanie** — odłożone; wymaga cron job (Edge Functions lub zewnętrzny scheduler)
- **Głosowanie anonimowe** — odrzucone; w prawie wspólnot mieszkaniowych wymagana jest identyfikacja głosujących

## Konsekwencje
- Schemat DB nie wymaga zmian (tabele i RLS gotowe od migracji 001/002)
- Nowe endpointy: 7 routes w `/api/resolutions`
- Nowe strony: `/admin/uchwaly` + `/panel/glosowania`
- Testy: 14 backend (pytest) + 12 frontend (vitest)

## Powiązania
- [[ADR-002-rls-bezpieczenstwo]] — polityki RLS dla votes/resolutions
- [[ADR-004-data-access-pattern]] — dane przez API (głosowanie) vs Supabase direct (odczyt listy)
- [[ADR-009-testing-strategy]] — wzorce testowe zastosowane do nowych endpointów
