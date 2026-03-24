-- ============================================
-- WM GABI - Migracja 013: Audit log triggers
-- Automatyczne logowanie operacji finansowych (wymóg RODO)
-- ============================================

-- Rozszerzenie CHECK constraint — dodanie 'generate' i 'config_change' do dozwolonych akcji
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN ('create', 'update', 'delete', 'generate', 'config_change'));

-- Indeksy dla wydajnego przeszukiwania audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);

-- ============================================
-- Funkcja triggerowa: logowanie zmian w tabelach finansowych
-- ============================================
CREATE OR REPLACE FUNCTION audit_financial_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Funkcja triggerowa: logowanie zmian finansowych w apartments
-- Loguje TYLKO gdy zmieniają się kolumny wpływające na finanse
-- ============================================
CREATE OR REPLACE FUNCTION audit_apartment_financial_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Loguj tylko zmiany kolumn finansowych
    IF OLD.initial_balance IS DISTINCT FROM NEW.initial_balance
       OR OLD.initial_balance_date IS DISTINCT FROM NEW.initial_balance_date
       OR OLD.area_m2 IS DISTINCT FROM NEW.area_m2
       OR OLD.declared_occupants IS DISTINCT FROM NEW.declared_occupants
       OR OLD.owner_resident_id IS DISTINCT FROM NEW.owner_resident_id
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
          'owner_resident_id', OLD.owner_resident_id
        ),
        jsonb_build_object(
          'initial_balance', NEW.initial_balance,
          'initial_balance_date', NEW.initial_balance_date,
          'area_m2', NEW.area_m2,
          'declared_occupants', NEW.declared_occupants,
          'owner_resident_id', NEW.owner_resident_id
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

-- ============================================
-- Triggery na tabelach finansowych
-- ============================================

-- charges: naliczenia miesięczne
CREATE TRIGGER audit_charges
  AFTER INSERT OR UPDATE OR DELETE ON charges
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

-- payments: wpłaty
CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

-- charge_rates: stawki naliczeń
CREATE TRIGGER audit_charge_rates
  AFTER INSERT OR UPDATE OR DELETE ON charge_rates
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

-- bank_statements: wyciągi bankowe
CREATE TRIGGER audit_bank_statements
  AFTER INSERT OR UPDATE OR DELETE ON bank_statements
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

-- apartments: tylko zmiany finansowe (dedykowana funkcja)
CREATE TRIGGER audit_apartments_financial
  AFTER INSERT OR UPDATE OR DELETE ON apartments
  FOR EACH ROW EXECUTE FUNCTION audit_apartment_financial_change();

-- ============================================
-- RLS: audit_log INSERT dla triggerów (SECURITY DEFINER)
-- Triggery używają SECURITY DEFINER, więc RLS nie blokuje zapisu.
-- Odczyt nadal tylko dla adminów (istniejąca polityka audit_log_admin).
-- ============================================
