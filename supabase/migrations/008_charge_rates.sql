-- ============================================
-- Migracja 008: System stawek i automatyczne generowanie naliczeń
-- Nowa tabela charge_rates z wersjonowaniem (valid_from),
-- declared_occupants w apartments, is_auto_generated w charges.
-- Usunięcie typów woda/ogrzewanie (rozliczane bezpośrednio przez dostawców).
-- ============================================

-- 1. Nowa tabela charge_rates
CREATE TABLE charge_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('eksploatacja', 'fundusz_remontowy', 'smieci')),
  rate_per_unit DECIMAL(10,4) NOT NULL,
  valid_from DATE NOT NULL,
  created_by UUID REFERENCES residents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeksy
CREATE UNIQUE INDEX idx_charge_rates_type_valid_from ON charge_rates(type, valid_from);
CREATE INDEX idx_charge_rates_valid_from ON charge_rates(valid_from DESC);

-- 2. RLS na charge_rates
ALTER TABLE charge_rates ENABLE ROW LEVEL SECURITY;

-- Odczyt: wszyscy zalogowani (mieszkańcy mogą widzieć aktualne stawki)
CREATE POLICY charge_rates_select ON charge_rates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Zapis: tylko admin
CREATE POLICY charge_rates_admin_insert ON charge_rates
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY charge_rates_admin_update ON charge_rates
  FOR UPDATE USING (is_admin());

CREATE POLICY charge_rates_admin_delete ON charge_rates
  FOR DELETE USING (is_admin());

-- 3. Nowe kolumny
ALTER TABLE apartments ADD COLUMN declared_occupants INTEGER NOT NULL DEFAULT 0;
ALTER TABLE charges ADD COLUMN is_auto_generated BOOLEAN NOT NULL DEFAULT false;

-- 4. Aktualizacja CHECK constraint na charges.type
-- UWAGA: przed uruchomieniem sprawdzić czy nie ma rekordów z type='woda'/'ogrzewanie':
--   SELECT count(*) FROM charges WHERE type IN ('woda', 'ogrzewanie');
-- Jeśli są — zmienić na 'inne' przed ALTER:
--   UPDATE charges SET type = 'inne' WHERE type IN ('woda', 'ogrzewanie');
ALTER TABLE charges DROP CONSTRAINT charges_type_check;
ALTER TABLE charges ADD CONSTRAINT charges_type_check
  CHECK (type IN ('eksploatacja', 'fundusz_remontowy', 'smieci', 'inne'));
