-- ============================================
-- Migracja 011: Data salda początkowego
-- Pozwala określić, na jaki dzień obowiązuje saldo początkowe.
-- Używane do ostrzegania przy generowaniu naliczeń za wcześniejsze miesiące.
-- ============================================

ALTER TABLE apartments ADD COLUMN initial_balance_date DATE;
