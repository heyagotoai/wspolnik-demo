-- ============================================
-- WM GABI - Migracja 012
-- 1. Votes DELETE policy dla admina
-- 2. Rate limiting na contact_messages (max 5 wiadomości / godzinę z tego samego emaila)
-- ============================================

-- ── 1. Admin może usuwać głosy ──────────────────────────────

CREATE POLICY votes_delete_admin ON votes
  FOR DELETE USING (is_admin());

-- ── 2. Rate limiting contact_messages ───────────────────────
-- Zastępujemy otwartą politykę INSERT WITH CHECK (true)
-- na taką, która limituje do 3 wiadomości na godzinę z tego samego emaila.
-- W RLS WITH CHECK, niekwalifikowane kolumny odnoszą się do wstawianego wiersza.

DROP POLICY IF EXISTS contact_messages_insert_public ON contact_messages;

CREATE POLICY contact_messages_insert_ratelimit ON contact_messages
  FOR INSERT WITH CHECK (
    (SELECT count(*) FROM contact_messages AS existing
     WHERE existing.email = email
       AND existing.created_at > now() - interval '1 hour'
    ) < 5
  );
