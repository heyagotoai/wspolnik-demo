-- ============================================
-- WM GABI - Migracja 026: Audit log — akcje zmiany konta (auth)
-- Rozszerzenie CHECK constraint o akcje:
--   'auth_email_change'   — admin zmienia email mieszkańca
--   'auth_password_reset' — admin generuje nowe hasło mieszkańca
--
-- Bez tej migracji INSERT do audit_log w endpointach
-- PATCH /residents/{id}/email i POST /residents/{id}/reset-password
-- rzucał constraint violation PO udanej zmianie w auth.users — backend
-- zwracał 500 bez `detail`, a frontend pokazywał generyczny błąd, mimo
-- że nowy email/hasło były już zapisane.
-- ============================================

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'create',
    'update',
    'delete',
    'generate',
    'config_change',
    'votes_reset',
    'auth_email_change',
    'auth_password_reset'
  ));
