-- Zgody RODO: akceptacja polityki prywatności i regulaminu (wersje + timestamp)
ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_version TEXT,
  ADD COLUMN IF NOT EXISTS terms_version TEXT;

COMMENT ON COLUMN residents.privacy_accepted_at IS 'Kiedy użytkownik zaakceptował obowiązującą wersję polityki prywatności.';
COMMENT ON COLUMN residents.terms_accepted_at IS 'Kiedy użytkownik zaakceptował obowiązującą wersję regulaminu.';
COMMENT ON COLUMN residents.privacy_version IS 'Identyfikator wersji polityki zapisany przy akceptacji (np. YYYY-MM-DD).';
COMMENT ON COLUMN residents.terms_version IS 'Identyfikator wersji regulaminu zapisany przy akceptacji (np. YYYY-MM-DD).';
