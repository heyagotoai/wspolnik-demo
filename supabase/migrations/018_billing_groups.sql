-- ============================================
-- WM GABI - Migracja 018: Grupy rozliczeniowe
-- Elastyczne grupowanie lokali jednego właściciela
-- dla wspólnego rozliczania wpłat i zbiorczego salda.
-- ============================================

-- ============================================
-- 1. Nowa tabela billing_groups
-- ============================================

CREATE TABLE billing_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER tr_billing_groups_updated_at
  BEFORE UPDATE ON billing_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. Nowe kolumny w istniejących tabelach
-- ============================================

-- apartments: przypisanie do grupy rozliczeniowej (opcjonalne)
ALTER TABLE apartments
  ADD COLUMN billing_group_id UUID REFERENCES billing_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_apartments_billing_group ON apartments(billing_group_id);

-- payments: wpłata grupowa + parent-child dla rozbicia
ALTER TABLE payments
  ADD COLUMN billing_group_id UUID REFERENCES billing_groups(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD COLUMN parent_payment_id UUID REFERENCES payments(id) ON DELETE CASCADE;

CREATE INDEX idx_payments_billing_group ON payments(billing_group_id);
CREATE INDEX idx_payments_parent ON payments(parent_payment_id);

-- ============================================
-- 3. Aktualizacja my_apartment_ids()
--    Dodaje lokale z tej samej grupy rozliczeniowej
-- ============================================

CREATE OR REPLACE FUNCTION my_apartment_ids()
RETURNS SETOF UUID AS $$
  -- Lokale własne (bezpośrednie lub przez apartment_number)
  SELECT a.id FROM apartments a
  JOIN residents r ON (
    a.owner_resident_id = r.id
    OR a.number = r.apartment_number
  )
  WHERE r.id = auth.uid() AND r.is_active = true

  UNION

  -- Lokale z tej samej grupy rozliczeniowej co lokale własne
  SELECT a2.id FROM apartments a2
  WHERE a2.billing_group_id IS NOT NULL
    AND a2.billing_group_id IN (
      SELECT a3.billing_group_id FROM apartments a3
      JOIN residents r2 ON (
        a3.owner_resident_id = r2.id
        OR a3.number = r2.apartment_number
      )
      WHERE r2.id = auth.uid() AND r2.is_active = true
        AND a3.billing_group_id IS NOT NULL
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 4. RLS na billing_groups
-- ============================================

ALTER TABLE billing_groups ENABLE ROW LEVEL SECURITY;

-- SELECT: admin/manager widzi wszystkie, mieszkaniec widzi swoje grupy
CREATE POLICY billing_groups_select ON billing_groups
  FOR SELECT USING (
    is_admin_or_manager()
    OR EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.billing_group_id = billing_groups.id
        AND (
          a.owner_resident_id = auth.uid()
          OR a.number = (
            SELECT apartment_number FROM residents
            WHERE id = auth.uid() AND is_active = true
            LIMIT 1
          )
        )
    )
  );

CREATE POLICY billing_groups_insert_admin ON billing_groups
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY billing_groups_update_admin ON billing_groups
  FOR UPDATE USING (is_admin());

CREATE POLICY billing_groups_delete_admin ON billing_groups
  FOR DELETE USING (is_admin());

-- ============================================
-- 5. Aktualizacja polityk RLS na apartments i payments
--    (uwzględnienie grup rozliczeniowych)
-- ============================================

-- APARTMENTS: mieszkaniec widzi swoje lokale + lokale z grupy rozliczeniowej
-- Używamy my_apartment_ids() (SECURITY DEFINER) żeby uniknąć nieskończonej
-- rekurencji — polityka nie może odpytywać tej samej tabeli bezpośrednio.
DROP POLICY IF EXISTS apartments_select ON apartments;
CREATE POLICY apartments_select ON apartments
  FOR SELECT USING (
    id IN (SELECT my_apartment_ids())
    OR is_admin_or_manager()
  );

-- PAYMENTS: mieszkaniec widzi parent payments swojej grupy
DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments
  FOR SELECT USING (
    apartment_id IN (SELECT my_apartment_ids())
    OR is_admin_or_manager()
    -- Parent payments grupy (apartment_id IS NULL)
    OR (
      apartment_id IS NULL
      AND billing_group_id IS NOT NULL
      AND billing_group_id IN (
        SELECT a.billing_group_id FROM apartments a
        WHERE a.billing_group_id IS NOT NULL
          AND a.id IN (SELECT my_apartment_ids())
      )
    )
  );

-- ============================================
-- 6. Audit log
-- ============================================

CREATE TRIGGER audit_billing_groups
  AFTER INSERT OR UPDATE OR DELETE ON billing_groups
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

-- Rozszerzenie audit_apartment_financial_change o billing_group_id
CREATE OR REPLACE FUNCTION audit_apartment_financial_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.initial_balance IS DISTINCT FROM NEW.initial_balance
       OR OLD.initial_balance_date IS DISTINCT FROM NEW.initial_balance_date
       OR OLD.area_m2 IS DISTINCT FROM NEW.area_m2
       OR OLD.declared_occupants IS DISTINCT FROM NEW.declared_occupants
       OR OLD.owner_resident_id IS DISTINCT FROM NEW.owner_resident_id
       OR OLD.billing_group_id IS DISTINCT FROM NEW.billing_group_id
    THEN
      INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
      VALUES (
        auth.uid(),
        'update',
        'apartments',
        NEW.id,
        jsonb_build_object(
          'initial_balance', OLD.initial_balance,
          'initial_balance_date', OLD.initial_balance_date,
          'area_m2', OLD.area_m2,
          'declared_occupants', OLD.declared_occupants,
          'owner_resident_id', OLD.owner_resident_id,
          'billing_group_id', OLD.billing_group_id
        ),
        jsonb_build_object(
          'initial_balance', NEW.initial_balance,
          'initial_balance_date', NEW.initial_balance_date,
          'area_m2', NEW.area_m2,
          'declared_occupants', NEW.declared_occupants,
          'owner_resident_id', NEW.owner_resident_id,
          'billing_group_id', NEW.billing_group_id
        )
      );
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'delete', 'apartments', OLD.id, to_jsonb(OLD));
    RETURN OLD;

  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'create', 'apartments', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
