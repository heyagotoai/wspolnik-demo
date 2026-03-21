-- ============================================
-- WM GABI - Row Level Security Policies
-- Migracja 002: Polityki bezpieczeństwa
-- ============================================

-- Helper: sprawdza czy user jest adminem
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM residents
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: pobiera apartment_id dla zalogowanego usera
CREATE OR REPLACE FUNCTION my_apartment_ids()
RETURNS SETOF UUID AS $$
  SELECT a.id FROM apartments a
  JOIN residents r ON r.id = a.owner_resident_id
  WHERE r.id = auth.uid() AND r.is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- RESIDENTS
-- ============================================
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

-- Mieszkaniec widzi tylko siebie
CREATE POLICY residents_select_own ON residents
  FOR SELECT USING (id = auth.uid() OR is_admin());

-- Tylko admin może dodawać/edytować/usuwać
CREATE POLICY residents_insert_admin ON residents
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY residents_update_admin ON residents
  FOR UPDATE USING (is_admin());

CREATE POLICY residents_delete_admin ON residents
  FOR DELETE USING (is_admin());

-- ============================================
-- APARTMENTS
-- ============================================
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;

-- Mieszkaniec widzi swój lokal, admin widzi wszystkie
CREATE POLICY apartments_select ON apartments
  FOR SELECT USING (owner_resident_id = auth.uid() OR is_admin());

CREATE POLICY apartments_insert_admin ON apartments
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY apartments_update_admin ON apartments
  FOR UPDATE USING (is_admin());

CREATE POLICY apartments_delete_admin ON apartments
  FOR DELETE USING (is_admin());

-- ============================================
-- CHARGES (naliczenia)
-- ============================================
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;

-- Mieszkaniec widzi tylko naliczenia dla swojego lokalu
CREATE POLICY charges_select ON charges
  FOR SELECT USING (apartment_id IN (SELECT my_apartment_ids()) OR is_admin());

CREATE POLICY charges_insert_admin ON charges
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY charges_update_admin ON charges
  FOR UPDATE USING (is_admin());

CREATE POLICY charges_delete_admin ON charges
  FOR DELETE USING (is_admin());

-- ============================================
-- PAYMENTS (wpłaty)
-- ============================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Mieszkaniec widzi tylko wpłaty dla swojego lokalu
CREATE POLICY payments_select ON payments
  FOR SELECT USING (apartment_id IN (SELECT my_apartment_ids()) OR is_admin());

CREATE POLICY payments_insert_admin ON payments
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY payments_update_admin ON payments
  FOR UPDATE USING (is_admin());

CREATE POLICY payments_delete_admin ON payments
  FOR DELETE USING (is_admin());

-- ============================================
-- BANK_STATEMENTS
-- ============================================
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

-- Tylko admin
CREATE POLICY bank_statements_admin ON bank_statements
  FOR ALL USING (is_admin());

-- ============================================
-- DOCUMENTS
-- ============================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Publiczne: wszyscy (nawet niezalogowani via anon key)
-- Prywatne: tylko zalogowani
CREATE POLICY documents_select ON documents
  FOR SELECT USING (is_public = true OR auth.uid() IS NOT NULL);

CREATE POLICY documents_insert_admin ON documents
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY documents_update_admin ON documents
  FOR UPDATE USING (is_admin());

CREATE POLICY documents_delete_admin ON documents
  FOR DELETE USING (is_admin());

-- ============================================
-- ANNOUNCEMENTS (ogłoszenia)
-- ============================================
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Odczyt: wszyscy (strona publiczna)
CREATE POLICY announcements_select ON announcements
  FOR SELECT USING (true);

CREATE POLICY announcements_insert_admin ON announcements
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY announcements_update_admin ON announcements
  FOR UPDATE USING (is_admin());

CREATE POLICY announcements_delete_admin ON announcements
  FOR DELETE USING (is_admin());

-- ============================================
-- IMPORTANT_DATES
-- ============================================
ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;

-- Odczyt: wszyscy
CREATE POLICY important_dates_select ON important_dates
  FOR SELECT USING (true);

CREATE POLICY important_dates_insert_admin ON important_dates
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY important_dates_update_admin ON important_dates
  FOR UPDATE USING (is_admin());

CREATE POLICY important_dates_delete_admin ON important_dates
  FOR DELETE USING (is_admin());

-- ============================================
-- RESOLUTIONS (uchwały)
-- ============================================
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;

-- Odczyt: zalogowani mieszkańcy
CREATE POLICY resolutions_select ON resolutions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY resolutions_insert_admin ON resolutions
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY resolutions_update_admin ON resolutions
  FOR UPDATE USING (is_admin());

CREATE POLICY resolutions_delete_admin ON resolutions
  FOR DELETE USING (is_admin());

-- ============================================
-- VOTES (głosy)
-- ============================================
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Mieszkaniec widzi/oddaje tylko swój głos
CREATE POLICY votes_select_own ON votes
  FOR SELECT USING (resident_id = auth.uid());

-- Admin widzi wszystkie głosy (do zliczania wyników)
CREATE POLICY votes_select_admin ON votes
  FOR SELECT USING (is_admin());

-- Mieszkaniec może oddać głos (tylko za siebie)
CREATE POLICY votes_insert_own ON votes
  FOR INSERT WITH CHECK (resident_id = auth.uid());

-- Nie można zmienić głosu (brak UPDATE policy)
-- Nie można usunąć głosu (brak DELETE policy)

-- ============================================
-- AUDIT_LOG
-- ============================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Tylko admin
CREATE POLICY audit_log_admin ON audit_log
  FOR ALL USING (is_admin());
