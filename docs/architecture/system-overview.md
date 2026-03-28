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
- Panel mieszkańca: salda (w tym wiele lokali / grupa rozliczeniowa), dokumenty, głosowania
- Panel admina: zarządzanie, naliczenia, grupy rozliczeniowe, import Excel (saldo początkowe); import wyciągów bankowych — backend w przygotowaniu po ustaleniu formatu
- Strona publiczna: ogłoszenia, ważne daty

### Auth (Supabase)
- Email + hasło
- RLS na każdej tabeli — [[ADR-002-rls-bezpieczenstwo]]

### Backend (FastAPI)
- Operacje uprzywilejowane (service_role)
- Import Excel — stan początkowy lokali (`/api/import`)
- Import wyciągów bankowych — format do ustalenia (osobna ścieżka niż Excel)
- Przyszłe: n8n webhooks, mailing

### Baza danych (PostgreSQL via Supabase)
- Schema: [[001_initial_schema.sql|migracja 001]]
- RLS: [[002_rls_policies.sql|migracja 002]]

## Powiązania
- [[ADR-001-stack-technologiczny]]
- [[Supabase]] | [[FastAPI]] | [[Vercel]]
