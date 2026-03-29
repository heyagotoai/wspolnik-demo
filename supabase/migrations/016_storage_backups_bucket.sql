-- ============================================
-- WM GABI - Supabase Storage: bucket "backups"
-- Migracja 016: Bucket na tygodniowe backupy danych
-- ============================================
-- Backupy są tworzone przez Vercel Cron (service_role key),
-- więc nie potrzebują RLS policies — service_role omija RLS.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false,
  52428800,  -- 50 MB (backup JSON może być większy niż pojedynczy PDF)
  ARRAY['application/json']
)
ON CONFLICT (id) DO NOTHING;
