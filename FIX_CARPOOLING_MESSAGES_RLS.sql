-- Politiques RLS pour carpooling_messages
-- Permet la messagerie sécurisée entre utilisateurs

-- Activer RLS si pas déjà fait
ALTER TABLE carpooling_messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view own messages" ON carpooling_messages;
DROP POLICY IF EXISTS "Users can send messages" ON carpooling_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON carpooling_messages;

-- SELECT: Les utilisateurs peuvent voir les messages où ils sont sender ou receiver
CREATE POLICY "Users can view own messages"
  ON carpooling_messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- INSERT: Les utilisateurs peuvent envoyer des messages
CREATE POLICY "Users can send messages"
  ON carpooling_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

-- UPDATE: Les utilisateurs peuvent mettre à jour les messages qu'ils ont REÇUS
-- (pour marquer comme lu)
CREATE POLICY "Users can update received messages"
  ON carpooling_messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Vérification
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'carpooling_messages'
ORDER BY policyname;
