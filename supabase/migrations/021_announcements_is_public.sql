-- Jawność ogłoszeń: strona główna i /aktualnosci (bez logowania) vs tylko panel mieszkańca

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN announcements.is_public IS
  'true = widoczne na stronie publicznej; false = tylko dla zalogowanych (panel)';

-- Auto-ogłoszenia o głosowaniu (treść wskazuje na panel) — nie na stronę publiczną
UPDATE announcements
SET is_public = false
WHERE title LIKE 'Nowe głosowanie:%';

DROP POLICY IF EXISTS announcements_select ON announcements;

CREATE POLICY announcements_select ON announcements
  FOR SELECT USING (
    is_public = true
    OR auth.uid() IS NOT NULL
  );
