# Architektura Systemu — WM Gabi

## Diagram

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   React      │────▶│   Supabase   │◀────│   FastAPI    │
│   (Vercel)   │     │  (Auth+DB)   │     │  (backend)   │
└─────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       │              ┌──────────────┐           │
       └─────────────▶│  Mieszkaniec │◀──────────┘
                      └──────────────┘
```

## Warstwy

### Frontend (React)
- Panel mieszkańca: salda, dokumenty, głosowania
- Panel admina: zarządzanie, naliczenia, import wyciągów
- Strona publiczna: ogłoszenia, ważne daty

### Auth (Supabase)
- Email + hasło
- RLS na każdej tabeli — [[ADR-002-rls-bezpieczenstwo]]

### Backend (FastAPI)
- Operacje uprzywilejowane (service_role)
- Import wyciągów bankowych (format do ustalenia)
- Przyszłe: n8n webhooks, mailing

### Baza danych (PostgreSQL via Supabase)
- Schema: [[001_initial_schema.sql|migracja 001]]
- RLS: [[002_rls_policies.sql|migracja 002]]

## Powiązania
- [[ADR-001-stack-technologiczny]]
- [[Supabase]] | [[FastAPI]] | [[Vercel]]
