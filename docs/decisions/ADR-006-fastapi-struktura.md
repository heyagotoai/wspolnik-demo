# ADR-006: Struktura FastAPI backend

**Status:** Przyjęty
**Data:** 2026-03-15

## Kontekst
Backend obsługuje operacje wymagające service_role key ([[ADR-004-data-access-pattern]]). Potrzebujemy czytelnej struktury.

## Decyzja
```
api/
├── index.py          ← entry point, CORS, routing
├── core/
│   ├── config.py     ← env vars (SUPABASE_URL, SERVICE_ROLE_KEY, FRONTEND_URL)
│   ├── security.py   ← get_current_user(), require_admin()
│   └── supabase_client.py ← singleton z service_role key
├── models/
│   └── schemas.py    ← Pydantic modele (ResidentCreate, ResidentOut, etc.)
├── routes/
│   └── residents.py  ← CRUD mieszkańców (admin-only)
└── services/         ← (przygotowane na przyszłość)
```

## Dlaczego
- **core/** — współdzielona infrastruktura (config, auth, klient DB)
- **models/** — walidacja danych wejściowych/wyjściowych (Pydantic)
- **routes/** — endpointy pogrupowane per zasób
- **services/** — przyszła logika biznesowa (import bankowy, naliczenia)
- Singleton Supabase client — jeden klient na cały proces, nie tworzony per request

## Edge cases
- CORS pozwala na localhost:5170-5179 w dev + `FRONTEND_URL` w produkcji
- Jeśli tworzenie auth usera się uda ale INSERT do `residents` nie — backend **kasuje auth usera** (rollback)

## Powiązania
- [[ADR-004-data-access-pattern]] — kiedy FastAPI vs bezpośredni Supabase
- [[ADR-003-auth-pattern]] — JWT weryfikowany w `security.py`
- [[Supabase]] — service_role key
