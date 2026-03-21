-- ============================================
-- WM GABI - Tabela wiadomości kontaktowych
-- Migracja 004: contact_messages
-- ============================================

CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  apartment_number TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_messages_read ON contact_messages(is_read);
CREATE INDEX idx_contact_messages_created ON contact_messages(created_at DESC);

-- RLS: tylko admin może czytać i zarządzać
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_messages_admin ON contact_messages
  FOR ALL USING (is_admin());

-- Publiczny insert (formularz kontaktowy nie wymaga logowania)
CREATE POLICY contact_messages_insert_public ON contact_messages
  FOR INSERT WITH CHECK (true);
