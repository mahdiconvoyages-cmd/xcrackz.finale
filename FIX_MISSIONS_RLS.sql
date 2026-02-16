-- 🔥 FIX: Permettre de lire les missions assignées à un utilisateur

-- 1. Vérifier les policies existantes sur missions
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'missions';

-- 2. Créer une policy pour lire les missions assignées
-- Un utilisateur peut lire une mission si :
-- - Il en est le propriétaire (user_id)
-- - OU elle lui a été assignée (via mission_assignments.user_id)

DROP POLICY IF EXISTS "read_assigned_missions" ON missions;

CREATE POLICY "read_assigned_missions" ON missions
  FOR SELECT
  USING (
    auth.uid() = user_id  -- Le propriétaire de la mission
    OR 
    EXISTS (  -- OU la mission lui a été assignée
      SELECT 1 FROM mission_assignments 
      WHERE mission_assignments.mission_id = missions.id 
      AND mission_assignments.user_id = auth.uid()
    )
  );

-- 3. Vérifier que la policy est bien créée
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'missions' AND policyname = 'read_assigned_missions';
