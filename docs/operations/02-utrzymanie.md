# Instrukcja utrzymania — WM Gabi

Dokument opisuje codzienne operacje, monitoring i debugowanie systemu.

---

## 1. Architektura — co gdzie działa

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Vercel CDN   │────▶│  Supabase    │◀────│ Vercel       │
│ (frontend)   │     │ (baza+auth)  │     │ (FastAPI)    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────────────┐
                     │ Edge Function│
                     │ (send-email) │
                     └──────────────┘
```

- **Frontend** → Supabase bezpośrednio (odczyty, auth, storage)
- **Frontend** → FastAPI `/api/*` (operacje uprzywilejowane: CRUD mieszkańców, naliczenia)
- **FastAPI** → Supabase z `service_role` key (omija RLS)

---

## 2. Monitoring

### Vercel
- Dashboard → Project → Deployments — status ostatnich buildów
- Dashboard → Project → Functions — logi serverless functions
- Dashboard → Project → Analytics — ruch na stronie

### Supabase
- Dashboard → Project → Logs — logi bazy danych i auth
- Dashboard → Project → Database → Replication — status bazy
- Dashboard → Project → Auth → Users — lista użytkowników

### Co sprawdzać regularnie
- `/api/health` — czy backend odpowiada
- Vercel Functions logs — czy nie ma 500-tek
- Supabase disk usage — czy nie zbliżasz się do limitu (500MB free)

---

## 3. Typowe operacje

### Dodanie nowej migracji SQL
1. Utwórz plik `supabase/migrations/NNN_nazwa.sql` (kolejny numer)
2. Przetestuj lokalnie (SQL Editor → dev project)
3. Uruchom na produkcji: SQL Editor → New Query → wklej → Run
4. Scommituj plik migracji do repo

### Przeglądanie dziennika operacji (audit log)
Panel admina → Dziennik operacji (`/admin/dziennik`). Logowane operacje:
- Naliczenia, wpłaty, stawki, wyciągi bankowe, lokale (zmiany finansowe)
- Głosy: oddanie i usunięcie (trigger na tabeli `votes`)
- Reset głosów: pełny snapshot głosów przed usunięciem (akcja `votes_reset`)

Filtry: tabela, typ akcji, zakres dat. Rozwijalne szczegóły z danymi JSON.

### Aktualizacja stawek naliczeń
Panel admina → Naliczenia → zakładka Stawki → Dodaj nową stawkę z datą "obowiązuje od". Stare stawki zostają (wersjonowanie). Naliczenia za przyszłe miesiące użyją nowej stawki.

### Dodanie mieszkańca
Panel admina → Mieszkańcy → Dodaj. System automatycznie:
1. Tworzy konto w Supabase Auth (email + hasło)
2. Wstawia rekord do tabeli `residents`
3. Przypisuje do lokalu (`owner_resident_id`)

### Usunięcie mieszkańca
Panel admina → Mieszkańcy → Usuń. System automatycznie:
1. Usuwa konto z Supabase Auth
2. Kasuje rekord z `residents` (CASCADE)
3. Odpina `owner_resident_id` z lokalu

### Reset hasła mieszkańca
Supabase Dashboard → Authentication → Users → znajdź usera → Send password reset email

---

## 4. Debugowanie

### Backend nie odpowiada (500)
1. Vercel Dashboard → Functions → Logs → znajdź błąd
2. Najczęstsze przyczyny:
   - Brak/błędny `SUPABASE_SERVICE_ROLE_KEY` w env vars
   - Zmiana schematu bazy bez aktualizacji kodu
   - Timeout (Vercel free: max 10s na funkcję)

### Mieszkaniec nie widzi swoich danych
1. Sprawdź czy `owner_resident_id` w tabeli `apartments` wskazuje na tego mieszkańca
2. Sprawdź czy `apartment_number` w `residents` odpowiada `number` w `apartments`
3. SQL Editor: `SELECT * FROM apartments WHERE owner_resident_id = 'UUID-mieszkanca'`

### Email nie dochodzi
1. Supabase → Edge Functions → send-email → Logs
2. Sprawdź sekrety SMTP (host, port, user, pass)
3. Sprawdź czy skrzynka SMTP nie jest zablokowana (az.pl → panel poczty)
4. Sprawdź spam/junk folder odbiorcy

### Błąd CORS
- Vercel: sprawdź `FRONTEND_URL` w env vars — musi być dokładny URL domeny (z https://)
- Dev: vite.config.ts proxy powinien kierować `/api` → `localhost:8000`

### Błąd "Brak tokenu" (401) na froncie
- Sesja wygasła → użytkownik musi się przelogować
- Sprawdź czy `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` są poprawne

---

## 5. Backup i przywracanie

### Automatyczne backupy (Supabase) — podstawa ochrony
- Darmowy plan: codzienne backupy, przechowywanie **7 dni** (łącznie z `auth.users`, Storage, całą bazą)
- Pro plan: Point-in-Time Recovery (do dowolnej sekundy)
- Automatyczny backup obejmuje **wszystko** — jest lepszy niż ręczny eksport SQL

### Przywracanie z backupu
1. Supabase Dashboard → Project Settings → Backups
2. Wybierz punkt przywracania → Restore
3. **UWAGA:** przywrócenie nadpisze WSZYSTKIE obecne dane
4. Selektywne przywracanie (np. tylko jedna tabela) → kontakt z supportem Supabase

### Manualny eksport danych finansowych (przed destrukcyjnymi operacjami)

Przed wykonaniem `DROP`, `DELETE`, `TRUNCATE` lub ryzykowną migracją — ręcznie zabezpiecz dane finansowe przez Supabase SQL Editor:

```sql
-- Eksport danych finansowych (CSV)
COPY (SELECT * FROM charges ORDER BY month) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM payments ORDER BY payment_date) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM apartments) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM charge_rates ORDER BY effective_from) TO STDOUT WITH CSV HEADER;
```

**Ważne ograniczenia ręcznego eksportu:**
- **Nie zawiera `auth.users`** — konta mieszkańców są zarządzane przez Supabase Auth i nie są dostępne przez SQL. Bez nich odtworzenie logowania wymaga re-invite wszystkich użytkowników.
- **Nie zawiera plików PDF** — `documents.file_path` to tylko referencja; pliki są w Storage bucket i wymagają osobnego pobrania.
- Ręczny eksport służy jako **dodatkowe zabezpieczenie danych finansowych**, nie jako pełny backup systemu.

---

## 6. Cron Job (auto-naliczenia)

Vercel uruchamia `/api/charges/cron` codziennie o 6:00 UTC.

**Warunki działania:**
- `system_settings.auto_charges_enabled` = `true`
- `system_settings.auto_charges_day` = dzień miesiąca (np. `1`)
- Endpoint wymaga nagłówka `Authorization: Bearer CRON_SECRET`

**Wyłączenie:** Panel admina → Naliczenia → Stawki → przełącznik auto-generowania

---

## 7. Limity (darmowy tier)

| Zasób | Limit | Jak sprawdzić |
|-------|-------|---------------|
| Supabase DB | 500 MB | Dashboard → Database → Usage |
| Supabase Auth | 50 000 MAU | Dashboard → Auth → Usage |
| Supabase Storage | 1 GB | Dashboard → Storage → Usage |
| Vercel Serverless | 100 GB-h/mies | Dashboard → Usage |
| Vercel Bandwidth | 100 GB/mies | Dashboard → Usage |
| Vercel Functions timeout | 10s | Nie konfigurowane |

Przy ~50 mieszkańcach darmowe plany wystarczą na lata.

---

## 8. Komendy deweloperskie

```bash
# Uruchom oba serwery (Windows)
dev.bat

# Lub ręcznie:
cd site && npm run dev                    # Frontend: localhost:5173
cd api && .venv/Scripts/python -m uvicorn api.index:app --reload  # Backend: localhost:8000

# Testy
cd api && .venv/Scripts/python -m pytest -v    # Backend (125 testów)
cd site && npm test                             # Frontend

# Build produkcyjny (test lokalnie)
cd site && npm run build && npm run preview
```
