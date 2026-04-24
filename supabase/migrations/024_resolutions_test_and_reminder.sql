-- Uchwały testowe (ukryte dla mieszkańców, pomijane przez cron przypomnień)
-- + znacznik wysłanego przypomnienia (zapobiega duplikatom cronu)

ALTER TABLE resolutions
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE resolutions
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_resolutions_reminder_pending
  ON resolutions (status, voting_end)
  WHERE status = 'voting' AND reminder_sent_at IS NULL AND is_test = false;
