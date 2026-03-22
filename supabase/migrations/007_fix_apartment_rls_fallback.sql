-- ============================================
-- Migracja 007: Naprawa RLS apartamentów
-- Problem: mieszkaniec z ustawionym apartment_number w tabeli residents
-- nie widzi swojego lokalu jeśli apartments.owner_resident_id nie jest ustawione.
-- Rozwiązanie: fallback do residents.apartment_number w funkcji i policy.
-- ============================================

-- Aktualizacja funkcji my_apartment_ids() — używana przez RLS charges/payments
CREATE OR REPLACE FUNCTION my_apartment_ids()
RETURNS SETOF UUID AS $$
  SELECT a.id FROM apartments a
  JOIN residents r ON (
    a.owner_resident_id = r.id
    OR a.number = r.apartment_number
  )
  WHERE r.id = auth.uid() AND r.is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Aktualizacja policy SELECT na apartments — dodaj fallback do apartment_number
DROP POLICY IF EXISTS apartments_select ON apartments;

CREATE POLICY apartments_select ON apartments
  FOR SELECT USING (
    owner_resident_id = auth.uid()
    OR number = (
      SELECT apartment_number FROM residents
      WHERE id = auth.uid() AND is_active = true
      LIMIT 1
    )
    OR is_admin()
  );
