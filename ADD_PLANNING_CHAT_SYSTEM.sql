-- ============================================================================
-- Migration: Planning Chat System - Messagerie entre convoyeurs matchés
-- Permet aux convoyeurs de communiquer après un match accepté
-- ============================================================================

-- 1. Table des messages entre convoyeurs matchés
CREATE TABLE IF NOT EXISTS planning_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES planning_matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index pour performance
CREATE INDEX IF NOT EXISTS idx_planning_messages_match ON planning_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_planning_messages_sender ON planning_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_planning_messages_created ON planning_messages(match_id, created_at);

-- 3. RLS
ALTER TABLE planning_messages ENABLE ROW LEVEL SECURITY;

-- Seuls les participants du match peuvent voir les messages
DROP POLICY IF EXISTS "Match participants can view messages" ON planning_messages;
CREATE POLICY "Match participants can view messages" ON planning_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM planning_matches pm
      WHERE pm.id = match_id
      AND (pm.user_a_id = auth.uid() OR pm.user_b_id = auth.uid())
    )
  );

-- Seuls les participants du match (accepté) peuvent envoyer des messages
DROP POLICY IF EXISTS "Match participants can send messages" ON planning_messages;
CREATE POLICY "Match participants can send messages" ON planning_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM planning_matches pm
      WHERE pm.id = match_id
      AND pm.status = 'accepted'
      AND (pm.user_a_id = auth.uid() OR pm.user_b_id = auth.uid())
    )
  );

-- L'expéditeur peut modifier ses messages (ex: suppression logique)
DROP POLICY IF EXISTS "Sender can update own messages" ON planning_messages;
CREATE POLICY "Sender can update own messages" ON planning_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Les destinataires peuvent marquer les messages comme lus
DROP POLICY IF EXISTS "Recipients can mark messages read" ON planning_messages;
CREATE POLICY "Recipients can mark messages read" ON planning_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM planning_matches pm
      WHERE pm.id = match_id
      AND (pm.user_a_id = auth.uid() OR pm.user_b_id = auth.uid())
    )
  );

-- 4. Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE planning_messages;

-- 5. Comments
COMMENT ON TABLE planning_messages IS 'Messages de chat entre convoyeurs matchés - uniquement pour les matchs acceptés';
