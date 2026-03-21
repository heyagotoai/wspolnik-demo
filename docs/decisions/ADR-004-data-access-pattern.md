# ADR-004: Bezpośredni dostęp do Supabase vs FastAPI backend

**Status:** Przyjęty
**Data:** 2026-03-15

## Kontekst
Mamy dwa sposoby komunikacji z bazą: bezpośrednio z React (anon key + RLS) lub przez [[FastAPI]] backend (service_role key).

## Decyzja
- **Odczyt danych** → bezpośrednio z React do [[Supabase]] (anon key + RLS)
- **Operacje wrażliwe** → przez FastAPI backend (service_role key)
  - Tworzenie mieszkańców (wymaga `auth.admin.createUser`)
  - Usuwanie mieszkańców (wymaga `auth.admin.deleteUser`)
- **CRUD ogłoszeń, dokumentów, dat** → bezpośrednio przez Supabase (RLS pilnuje uprawnień)

## Dlaczego
- RLS gwarantuje bezpieczeństwo na poziomie bazy — frontend nie może "zobaczyć za dużo"
- Backend potrzebny tylko tam, gdzie anon key nie wystarczy (zarządzanie użytkownikami auth)
- Mniej kodu, mniej punktów awarii — nie piszemy endpointów REST dla każdej tabeli

## Edge cases
- Jeśli w przyszłości dodamy logikę biznesową (np. walidacja naliczeń) — przenosimy do FastAPI
- Import bankowy — będzie w FastAPI (parsowanie pliku + operacje batch)

## Powiązania
- [[ADR-002-rls-bezpieczenstwo]] — RLS jako fundament tego podejścia
- [[ADR-003-auth-pattern]] — token auth przekazywany w headerze do FastAPI
