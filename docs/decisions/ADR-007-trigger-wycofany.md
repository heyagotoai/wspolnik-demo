# ADR-007: Wycofanie triggera handle_new_user

**Status:** Wycofany (migracja 003)
**Data:** 2026-03-15

## Kontekst
Początkowo planowaliśmy trigger PostgreSQL, który automatycznie tworzy rekord w `residents` po każdym nowym użytkowniku w `auth.users`.

## Problem
Trigger powodował błąd "Database error creating new user" przy wywołaniu `admin.create_user()` z [[FastAPI]]. Trigger i endpoint robiły to samo — konflikt.

## Decyzja
- Migracja 003 **usuwa** trigger (`DROP TRIGGER IF EXISTS`)
- Tworzenie mieszkańca jest **wyłącznie** w FastAPI endpoint `POST /api/residents`
- Endpoint sam tworzy auth usera + rekord w `residents` w jednej operacji z rollbackiem

## Dlaczego
- Jedno miejsce odpowiedzialne za tworzenie = łatwiejsze debugowanie
- Rollback w kodzie Python jest prostszy niż w triggerze SQL
- Trigger nie miał dostępu do danych formularza (apartment_number, role)

## Lekcja
Triggery są dobre do automatyzacji prostych operacji (np. `updated_at`), ale nie do logiki biznesowej z wieloma krokami.

## Powiązania
- [[ADR-006-fastapi-struktura]] — endpoint residents
- [[ADR-004-data-access-pattern]] — dlaczego FastAPI a nie frontend
