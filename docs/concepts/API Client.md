# API Client (lib/api.ts)

Wrapper HTTP do komunikacji frontend → [[FastAPI]] backend.

## Jak działa
1. Pobiera aktywną sesję Supabase (`supabase.auth.getSession()`)
2. Wyciąga [[JWT]] token z sesji
3. Dodaje header `Authorization: Bearer <token>` do każdego requestu
4. Obsługuje odpowiedź: parsuje JSON lub rzuca błąd z polem `detail`

## Metody
- `api.get<T>(path)` — GET
- `api.post<T>(path, body)` — POST z JSON body
- `api.patch<T>(path, body)` — PATCH z JSON body
- `api.delete<T>(path)` — DELETE

## Konfiguracja
- `VITE_API_URL` env var → bazowy URL (domyślnie `/api`)
- Generyczne typy TypeScript dla type-safe odpowiedzi

## Gdzie używany
- `ResidentsPage` (admin) — tworzenie/usuwanie mieszkańców przez backend
- Przyszłe: import bankowy, inne operacje wymagające service_role

## Powiązania
- [[ADR-004-data-access-pattern]] — kiedy używamy API client vs bezpośredni Supabase
- [[ADR-006-fastapi-struktura]] — co jest po stronie backendu
- [[JWT]] — token przekazywany w headerze
