# ADR-011: Supabase Edge Function do wysyłki emaili

## Status
Accepted

## Kontekst
Vercel serverless functions blokują połączenia SMTP na portach 25/465/587 (`[Errno 16] Device or resource busy`). Bezpośrednia wysyłka emaili z FastAPI na Vercel jest niemożliwa.

## Decyzja
Używamy **Supabase Edge Function** (`send-email`) jako relay do wysyłki emaili przez SMTP az.pl.

### Przepływ
```
FastAPI (Vercel) → HTTP POST → Edge Function (Supabase) → SMTP → az.pl → wmgabi@wp.pl
```

### Szczegóły
- Edge Function: `supabase/functions/send-email/index.ts`
- SMTP: `hosting2641439.online.pro:465` (SSL)
- Nadawca: `powiadomienia@wmgabi.pl`
- Odbiorca powiadomień: `wmgabi@wp.pl`
- Biblioteka: `denomailer` (Deno SMTP client)

## Wyjątek od reguły
Projekt używa zasady "Edge Functions NIE używane — cały backend logic w FastAPI". Ta Edge Function jest **wyjątkiem** — służy wyłącznie jako relay SMTP, nie zawiera logiki biznesowej.

## Alternatywy rozważane
- **Resend** — dodatkowy serwis zewnętrzny, użytkownik wolał wykorzystać istniejącą pocztę az.pl
- **Railway dla backendu** — przeniesienie FastAPI na platformę bez blokady SMTP, zbyt duża zmiana
- **pg_net** — HTTP z PostgreSQL, wymaga i tak HTTP email API

## Rozszerzenie (2026-03-24) — Załącznik PDF

Powiadomienie o saldzie wysyła PDF jako załącznik zamiast plain text.

- `api/core/saldo_pdf.py` generuje PDF (ReportLab + DejaVu Sans) z logo, nagłówkiem, kwotą i danymi konta
- Czcionki DejaVu bundled w `api/assets/fonts/` — pełna obsługa polskich znaków na Vercel/Linux
- Edge Function rozszerzona o opcjonalne pola `attachment_base64` + `attachment_filename` — backward compatible (brak pola = wysyłka bez załącznika)
- Treść maila: krótki cover text, szczegóły w PDF

## Konsekwencje
- Sekrety SMTP w Supabase Edge Function Secrets (nie w Vercel env vars)
- `SUPABASE_ANON_KEY` potrzebny w Vercel do wywołania Edge Function
- Wysyłka emaili jest asynchroniczna i nie blokuje odpowiedzi API
- Zmiana Edge Function wymaga re-deploy: `supabase functions deploy send-email`
