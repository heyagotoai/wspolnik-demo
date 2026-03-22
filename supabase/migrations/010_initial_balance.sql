-- ============================================
-- Migracja 010: Saldo początkowe lokalu
-- Pozwala na wprowadzenie historycznego salda przy wdrożeniu systemu.
-- Wartość dodatnia = nadpłata, ujemna = zaległość.
-- ============================================

ALTER TABLE apartments ADD COLUMN initial_balance DECIMAL(10,2) NOT NULL DEFAULT 0;
