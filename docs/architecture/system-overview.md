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
- Panel admina: zarządzanie, naliczenia, grupy rozliczeniowe, import Excel (saldo początkowe, wpłaty z dopasowań), import zestawienia bankowego `.xls` (deduplikacja wpłat — [[ADR-014-payment-import-deduplication|ADR-014]]); uchwały (głosy z zebrania przed publikacją, eksport PDF — [[ADR-010-voting-system|ADR-010]]); opcjonalnie MT940 — osobna ścieżka, gdy bank udostępni
- Strona publiczna: ogłoszenia, ważne daty

### Auth (Supabase)
- Email + hasło
- RLS na każdej tabeli — [[ADR-002-rls-bezpieczenstwo]]

### Backend (FastAPI)
- Operacje uprzywilejowane (service_role)
- Import Excel — stan początkowy lokali (`/api/import`), wpłaty z arkusza dopasowań (`/api/import/payments`)
- Import zestawienia bankowego `.xls` — `POST /api/import/payments-bank-statement` (xlrd); deduplikacja jak przy wpłatach z Excela — [[ADR-014-payment-import-deduplication|ADR-014]]
- Przyszłe: n8n webhooks, mailing

### Baza danych (PostgreSQL via Supabase)
- Schema: [[001_initial_schema.sql|migracja 001]]
- RLS: [[002_rls_policies.sql|migracja 002]]

## Powiązania
- [[ADR-001-stack-technologiczny]]
- [[ADR-010-voting-system]] — głosowania nad uchwałami (w tym głosy z zebrania)
- [[ADR-011-edge-function-email]] — wysyłka emaili przez Edge Function (relay SMTP, wyjątek od reguły FastAPI-only)
- [[Supabase]] | [[FastAPI]] | [[Vercel]]
