-- ============================================
-- Migracja 009: Tabela ustawień systemowych
-- Klucz-wartość dla konfiguracji wspólnoty (auto-naliczenia itp.)
-- ============================================

CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Domyślne ustawienia auto-generowania naliczeń (wyłączone)
INSERT INTO system_settings (key, value) VALUES
  ('auto_charges_enabled', 'false'),
  ('auto_charges_day', '1');

-- RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Odczyt: wszyscy zalogowani
CREATE POLICY system_settings_select ON system_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Zapis: tylko admin
CREATE POLICY system_settings_update_admin ON system_settings
  FOR UPDATE USING (is_admin());

CREATE POLICY system_settings_insert_admin ON system_settings
  FOR INSERT WITH CHECK (is_admin());
