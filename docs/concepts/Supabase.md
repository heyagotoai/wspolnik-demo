# Supabase

Backend-as-a-Service oparty na PostgreSQL.

## Rola w projekcie
- **Auth** — logowanie mieszkańców (email + hasło)
- **Baza danych** — PostgreSQL z [[ADR-002-rls-bezpieczenstwo|RLS]]
- **Storage** — pliki dokumentów (przyszłość)

## Powiązania
- [[ADR-001-stack-technologiczny]] — wybór stacku
- [[ADR-002-rls-bezpieczenstwo]] — polityki bezpieczeństwa
- [[FastAPI]] — komunikuje się z Supabase przez SDK
