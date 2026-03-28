# Instrukcja wdrożeniowa — WM Gabi

Dokument opisuje jak wdrożyć system od zera na nowym środowisku.

---

## 1. Wymagania wstępne

- Konto GitHub (repozytorium z kodem)
- Konto Vercel (darmowy tier wystarczy)
- Konto Supabase (darmowy tier wystarczy dla ~50 lokali)
- Domena z dostępem do DNS (np. az.pl, OVH, Cloudflare)
- Konto pocztowe SMTP do powiadomień (np. hosting az.pl)
- Node.js 18+ i Python 3.12+ (do developmentu)
- Backend: `api/requirements.txt` — **wersje przypięte na sztywno** (`==`), powtarzalne instalacje na Vercelu i lokalnie; m.in. **`tzdata`** (Windows / `Europe/Warsaw` w mailach), **`openpyxl`** (import `.xlsx`), **`xlrd`** (zestawienie `.xls` / `payments-bank-statement`)
- Frontend: `site/package.json` — przypięte wersje bez `^` (spójnie z `package-lock.json`); po klonowania repozytorium: `cd site && npm ci`

---

## 2. Supabase — setup bazy danych

### 2.1 Utwórz projekt
1. Zaloguj się na [supabase.com](https://supabase.com)
2. New Project → Region: **EU (Frankfurt)** → ustaw hasło bazy
3. Poczekaj na provisioning (~2 min)

### 2.2 Zapisz klucze
Project Settings → API:
- `Project URL` → to jest `SUPABASE_URL`
- `anon public` → to jest `VITE_SUPABASE_ANON_KEY`
- `service_role secret` → to jest `SUPABASE_SERVICE_ROLE_KEY` (NIGDY nie ujawniaj publicznie!)

### 2.3 Uruchom migracje
SQL Editor → New Query → skopiuj i uruchom **po kolei**:

```
001_initial_schema.sql      — tabele, indeksy, triggery
002_rls_policies.sql        — Row Level Security (KRYTYCZNE!)
003_handle_new_user_trigger.sql — usunięcie triggera (FastAPI obsługuje)
004_contact_messages.sql    — tabela wiadomości kontaktowych
005_storage_documents_bucket.sql — bucket na dokumenty PDF
006_announcements_email_sent.sql — śledzenie wysłanych emaili
007_fix_apartment_rls_fallback.sql — fallback RLS na apartment_number
008_charge_rates.sql        — stawki + auto-generowanie
009_system_settings.sql     — ustawienia systemowe
010_initial_balance.sql     — saldo początkowe
011_initial_balance_date.sql — data salda początkowego
```

**Kolejność jest ważna!** Każda migracja zależy od poprzednich.

### 2.4 Wyłącz publiczną rejestrację
Authentication → Providers → Email → wyłącz "Enable email confirmations" (admin tworzy konta)

### 2.5 Utwórz konto admina
SQL Editor:
```sql
-- Najpierw utwórz auth usera przez dashboard:
-- Authentication → Users → Invite user → wpisz email admina

-- Następnie wstaw rekord do residents:
INSERT INTO residents (id, email, full_name, role)
VALUES (
  'UUID-z-auth-users',  -- skopiuj z Authentication → Users
  'admin@twojadomena.pl',
  'Imię Nazwisko',
  'admin'
);
```

---

## 3. Vercel — deploy

### 3.1 Importuj repozytorium
1. Zaloguj się na [vercel.com](https://vercel.com)
2. New Project → Import Git Repository → wybierz repo
3. Framework Preset: **Other** (vercel.json obsługuje konfigurację)

### 3.2 Ustaw zmienne środowiskowe
Project Settings → Environment Variables:

| Zmienna | Wartość | Środowisko |
|---------|---------|------------|
| `SUPABASE_URL` | `https://XXXX.supabase.co` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Production |
| `VITE_SUPABASE_URL` | `https://XXXX.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Production |
| `FRONTEND_URL` | `https://twojadomena.pl` | Production |
| `CRON_SECRET` | dowolny losowy string | Production |

### 3.3 Podłącz domenę
Project Settings → Domains → Add → wpisz domenę

W panelu DNS domeny dodaj:
- **A record:** `@` → `76.76.21.21` (Vercel)
- **CNAME:** `www` → `cname.vercel-dns.com`

### 3.4 Zweryfikuj deploy
- `https://twojadomena.pl` — strona główna
- `https://twojadomena.pl/api/health` — powinno zwrócić `{"status": "ok"}`

---

## 4. Email — konfiguracja SMTP

### 4.1 Edge Function (send-email)
Supabase Dashboard → Edge Functions → deploy function `send-email`:
```bash
supabase functions deploy send-email
```

### 4.2 Sekrety SMTP
Supabase Dashboard → Edge Functions → send-email → Secrets:

| Secret | Wartość |
|--------|---------|
| `SMTP_HOST` | Adres serwera SMTP (np. `hosting2641439.online.pro`) |
| `SMTP_PORT` | `465` (SSL) |
| `SMTP_USER` | `powiadomienia@twojadomena.pl` |
| `SMTP_PASS` | Hasło do skrzynki SMTP |

### 4.3 Test wysyłki
Panel admina → Ogłoszenia → Utwórz ogłoszenie → "Wyślij emailem"

---

## 5. Weryfikacja po wdrożeniu

Checklist:
- [ ] Strona publiczna się ładuje
- [ ] `/api/health` zwraca `{"status": "ok"}`
- [ ] Logowanie admina działa
- [ ] Admin może dodać mieszkańca (tworzy auth user)
- [ ] Mieszkaniec może się zalogować
- [ ] Mieszkaniec widzi TYLKO swoje dane (nie cudze)
- [ ] Upload dokumentu PDF działa
- [ ] Formularz kontaktowy wysyła wiadomość
- [ ] Email z ogłoszeniem dochodzi

---

## 6. Struktura plików (kluczowe)

```
vercel.json          — konfiguracja deploy (build, rewrites, cron)
site/.env            — VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
api/.env             — SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL
supabase/migrations/ — migracje SQL (uruchamiane ręcznie w SQL Editor)
supabase/functions/  — Edge Functions (deploy przez supabase CLI)
```
