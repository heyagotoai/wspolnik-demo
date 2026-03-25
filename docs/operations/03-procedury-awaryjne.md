# Procedury awaryjne — WM Gabi

Co robić gdy coś nie działa.

---

## 1. Strona się nie ładuje

**Objawy:** biała strona, 404, timeout

**Kroki:**
1. Sprawdź status Vercel: [vercel.com/status](https://www.vercel-status.com/)
2. Sprawdź czy domena wskazuje na Vercel: `nslookup twojadomena.pl`
3. Sprawdź ostatni deploy: Vercel Dashboard → Deployments
4. Jeśli ostatni deploy failed → kliknij "Redeploy" na poprzednim działającym

**Rollback:**
- Vercel Dashboard → Deployments → znajdź ostatni working → "..." → Promote to Production

---

## 2. API nie odpowiada (500 / timeout)

**Objawy:** panel się ładuje, ale dane nie wchodzą, błędy w konsoli

**Kroki:**
1. Sprawdź `/api/health` — jeśli nie odpowiada, problem z Vercel Functions
2. Vercel → Functions → Logs → szukaj stacktrace'u
3. Najczęściej: env vars się zresetowały → Project Settings → Environment Variables → zweryfikuj
4. Jeśli timeout → funkcja trwa >10s → zoptymalizuj zapytanie

---

## 3. Supabase nie odpowiada

**Objawy:** "Failed to fetch", błędy auth, dane się nie ładują

**Kroki:**
1. Sprawdź status: [status.supabase.com](https://status.supabase.com/)
2. Supabase Dashboard → czy projekt jest aktywny (free tier pauzuje po 7 dniach nieaktywności!)
3. Jeśli spausowany → Dashboard → Restore project
4. Zweryfikuj klucze API (mogły się zrotować po pauzie)

**UWAGA:** Darmowy tier Supabase **pauzuje projekt po 7 dniach bez aktywności.** Rozwiązanie:
- Upgrade do Pro ($25/mies) lub
- Cron job pingujący `/api/health` codziennie (Vercel cron to robi automatycznie)

---

## 4. Mieszkaniec nie może się zalogować

**Kroki:**
1. Czy email jest poprawny? Supabase → Auth → Users → szukaj
2. Czy user istnieje w `residents`? SQL Editor: `SELECT * FROM residents WHERE email = '...'`
3. Czy `is_active = true`?
4. Reset hasła: Auth → Users → Send password reset
5. Jeśli nic nie pomaga → usuń i utwórz ponownie (Panel admina → Mieszkańcy)

---

## 5. Dane finansowe się nie zgadzają

**Kroki:**
1. Sprawdź saldo w SQL:
```sql
SELECT
  a.number,
  a.initial_balance,
  COALESCE(SUM(p.amount), 0) AS suma_wplat,
  COALESCE(SUM(c.amount), 0) AS suma_naliczen,
  a.initial_balance + COALESCE(SUM(p.amount), 0) - COALESCE(SUM(c.amount), 0) AS saldo
FROM apartments a
LEFT JOIN payments p ON p.apartment_id = a.id
LEFT JOIN charges c ON c.apartment_id = a.id
WHERE a.number = 'NUMER_LOKALU'
GROUP BY a.id;
```
2. Sprawdź czy `initial_balance` jest poprawne
3. Sprawdź czy nie ma zduplikowanych naliczeń: `SELECT * FROM charges WHERE apartment_id = '...' ORDER BY month`
4. Sprawdź `initial_balance_date` — czy naliczenia nie pokrywają się z okresem salda

---

## 6. Email nie dochodzi

**Kroki:**
1. Supabase → Edge Functions → send-email → Logs
2. Jeśli "Connection refused" → sprawdź SMTP sekrety
3. Jeśli "Authentication failed" → zmień hasło w panelu poczty i zaktualizuj secret
4. Jeśli wysyłka OK ale email nie dochodzi → sprawdź spam/junk u odbiorcy
5. Sprawdź czy domena ma DKIM/SPF: `nslookup -type=txt twojadomena.pl`

---

## 7. Utrata danych

**Scenariusz:** przypadkowe usunięcie danych, błędna migracja

**Kroki:**
1. **NIE PANIKUJ.** Supabase ma automatyczne backupy (7 dni wstecz na free tier)
2. Dashboard → Project Settings → Backups → wybierz datę → Restore
3. Jeśli potrzebujesz selektywnego przywracania (np. tylko tabela `charges`) → skontaktuj się z supportem Supabase
4. **Zapobieganie:** Przed destrukcyjnymi operacjami (DROP, DELETE, ALTER) — zrób manualny eksport danych finansowych (patrz: [02-utrzymanie.md § Backup](02-utrzymanie.md))

**Co obejmuje automatyczny backup Supabase:**
- Całą bazę danych łącznie z `auth.users` (konta mieszkańców)
- Storage bucket z plikami PDF
- Wszystkie tabele aplikacji

**Czego NIE zastąpi backup Supabase:**
- Utracone sekrety SMTP/API (przechowywane tylko w Supabase Secrets / Vercel Env) — patrz niżej

---

## 8. Kompromitacja sekretów

**Scenariusz:** wyciek `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_PASSWORD` lub `CRON_SECRET`

**Kroki:**
1. **`SUPABASE_SERVICE_ROLE_KEY`** — Supabase Dashboard → Project Settings → API → Reveal → Reset → zaktualizuj w Vercel Env Vars → zrób nowy deploy
2. **`SMTP_PASSWORD`** — panel az.pl → zmień hasło skrzynki → Supabase → Edge Functions → Secrets → zaktualizuj `SMTP_PASSWORD`
3. **`CRON_SECRET`** — wygeneruj nową wartość (`openssl rand -hex 32`) → zaktualizuj w Supabase Secrets i Vercel Env Vars
4. Po rotacji sprawdź logi (czy nie było nieautoryzowanych wywołań): Supabase → Logs, Vercel → Functions Logs

---

## 8. Kontakty awaryjne

| Co | Gdzie |
|----|-------|
| Status Vercel | vercel-status.com |
| Status Supabase | status.supabase.com |
| Support Supabase | Dashboard → Support (free: community, Pro: ticket) |
| Support Vercel | vercel.com/support |
| Panel DNS (az.pl) | panel.az.pl |
| Panel poczty (az.pl) | poczta.az.pl |
| Repozytorium | github.com/wmgabi/gabi-site |
