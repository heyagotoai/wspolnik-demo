-- Mieszkańcy „bez konta" — email opcjonalny
-- Pozwala dodać właściciela lokalu do rejestru (np. do głosów z zebrania)
-- bez zakładania mu konta logowania.
--
-- Technicznie: auth user i tak powstaje (FK residents.id -> auth.users.id),
-- ale z placeholder-emailem wewnętrznym i banem na ~100 lat (brak loginu).
-- W tabeli residents w takim przypadku email = NULL, has_account = false.

ALTER TABLE residents ALTER COLUMN email DROP NOT NULL;

-- UNIQUE(email) traktuje NULL jako distinct w Postgresie, więc można zostawić
-- — ale dla jasności zamieniamy na partial unique index (tylko gdy email IS NOT NULL).
ALTER TABLE residents DROP CONSTRAINT IF EXISTS residents_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS residents_email_unique_not_null
  ON residents(email)
  WHERE email IS NOT NULL;

ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS has_account BOOLEAN NOT NULL DEFAULT true;

-- Backfill: wszyscy istniejący rezydenci mają konto (stan sprzed migracji)
UPDATE residents SET has_account = true WHERE has_account IS DISTINCT FROM true;
