-- ============================================
-- WM GABI - Migracja 015: Audit log dla głosów (votes)
-- Trigger logujący oddanie i usunięcie głosów
-- + akcja 'votes_reset' dla snapshotu przed resetem
-- ============================================

-- Rozszerzenie CHECK constraint — dodanie 'votes_reset' do dozwolonych akcji
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN ('create', 'update', 'delete', 'generate', 'config_change', 'votes_reset'));

-- Trigger na tabeli votes — loguje INSERT i DELETE
CREATE TRIGGER audit_votes
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();
