-- ============================================
-- WM GABI - Migracja 017: Rola zarządcy
-- Dodaje rolę 'manager' z ograniczonymi prawami:
--   - podgląd wszystkich danych finansowych
--   - pełny CRUD ogłoszeń i terminów
--   - bez zarządzania mieszkańcami, stawkami, naliczeniami
-- ============================================

-- 1. Rozszerzenie CHECK constraint na residents.role
ALTER TABLE residents DROP CONSTRAINT IF EXISTS residents_role_check;
ALTER TABLE residents ADD CONSTRAINT residents_role_check
  CHECK (role IN ('admin', 'resident', 'manager'));

-- 2. Nowe helper functions

CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM residents
    WHERE id = auth.uid() AND role = 'manager' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM residents
    WHERE id = auth.uid() AND role IN ('admin', 'manager') AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 3. Aktualizacja polityk RLS — SELECT dla zarządcy
-- ============================================

-- RESIDENTS: zarządca widzi listę mieszkańców (bez możliwości edycji)
DROP POLICY IF EXISTS residents_select_own ON residents;
CREATE POLICY residents_select_own ON residents
  FOR SELECT USING (id = auth.uid() OR is_admin_or_manager());

-- APARTMENTS: zarządca widzi wszystkie lokale
DROP POLICY IF EXISTS apartments_select ON apartments;
CREATE POLICY apartments_select ON apartments
  FOR SELECT USING (owner_resident_id = auth.uid() OR is_admin_or_manager());

-- CHARGES: zarządca widzi wszystkie naliczenia
DROP POLICY IF EXISTS charges_select ON charges;
CREATE POLICY charges_select ON charges
  FOR SELECT USING (apartment_id IN (SELECT my_apartment_ids()) OR is_admin_or_manager());

-- PAYMENTS: zarządca widzi wszystkie wpłaty
DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments
  FOR SELECT USING (apartment_id IN (SELECT my_apartment_ids()) OR is_admin_or_manager());

-- BANK_STATEMENTS: zarządca widzi wyciągi (rozdzielamy FOR ALL na osobne polityki)
DROP POLICY IF EXISTS bank_statements_admin ON bank_statements;
CREATE POLICY bank_statements_select ON bank_statements
  FOR SELECT USING (is_admin_or_manager());
CREATE POLICY bank_statements_insert_admin ON bank_statements
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY bank_statements_update_admin ON bank_statements
  FOR UPDATE USING (is_admin());
CREATE POLICY bank_statements_delete_admin ON bank_statements
  FOR DELETE USING (is_admin());

-- CONTACT_MESSAGES: zarządca widzi wiadomości (bez usuwania)
DROP POLICY IF EXISTS contact_messages_admin ON contact_messages;
CREATE POLICY contact_messages_select ON contact_messages
  FOR SELECT USING (is_admin_or_manager());
CREATE POLICY contact_messages_update_admin ON contact_messages
  FOR UPDATE USING (is_admin());
CREATE POLICY contact_messages_delete_admin ON contact_messages
  FOR DELETE USING (is_admin());

-- VOTES: zarządca widzi wszystkie głosy (wyniki uchwał)
DROP POLICY IF EXISTS votes_select_admin ON votes;
CREATE POLICY votes_select_admin ON votes
  FOR SELECT USING (is_admin_or_manager());

-- AUDIT_LOG: zarządca może przeglądać dziennik operacji
-- INSERT obsługiwany przez triggery SECURITY DEFINER (pomijają RLS)
DROP POLICY IF EXISTS audit_log_admin ON audit_log;
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (is_admin_or_manager());
CREATE POLICY audit_log_insert_trigger ON audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. Aktualizacja polityk WRITE — pełny CRUD dla zarządcy
--    na ogłoszeniach i terminach
-- ============================================

-- ANNOUNCEMENTS: zarządca może tworzyć/edytować/usuwać ogłoszenia
DROP POLICY IF EXISTS announcements_insert_admin ON announcements;
DROP POLICY IF EXISTS announcements_update_admin ON announcements;
DROP POLICY IF EXISTS announcements_delete_admin ON announcements;
CREATE POLICY announcements_insert ON announcements
  FOR INSERT WITH CHECK (is_admin_or_manager());
CREATE POLICY announcements_update ON announcements
  FOR UPDATE USING (is_admin_or_manager());
CREATE POLICY announcements_delete ON announcements
  FOR DELETE USING (is_admin_or_manager());

-- IMPORTANT_DATES: zarządca może tworzyć/edytować/usuwać terminy
DROP POLICY IF EXISTS important_dates_insert_admin ON important_dates;
DROP POLICY IF EXISTS important_dates_update_admin ON important_dates;
DROP POLICY IF EXISTS important_dates_delete_admin ON important_dates;
CREATE POLICY important_dates_insert ON important_dates
  FOR INSERT WITH CHECK (is_admin_or_manager());
CREATE POLICY important_dates_update ON important_dates
  FOR UPDATE USING (is_admin_or_manager());
CREATE POLICY important_dates_delete ON important_dates
  FOR DELETE USING (is_admin_or_manager());
