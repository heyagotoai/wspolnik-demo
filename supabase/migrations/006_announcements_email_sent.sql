-- ============================================
-- WM GABI - Migracja 006
-- Dodanie kolumny email_sent_at do announcements
-- (data wysłania mailingu do mieszkańców)
-- ============================================

ALTER TABLE announcements
  ADD COLUMN email_sent_at TIMESTAMPTZ DEFAULT NULL;
