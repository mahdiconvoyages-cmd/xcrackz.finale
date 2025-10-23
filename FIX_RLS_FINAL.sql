-- 🔥 FIX FINAL: RLS policies pour mission_assignments
-- Permettre de gérer les assignations des missions qu'on a créées

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "select_own_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "insert_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "update_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "delete_assignments" ON mission_assignments;

-- POLICY SELECT: Voir ses assignations + celles des missions qu'on a créées
CREATE POLICY "select_assignments" ON mission_assignments
  FOR SELECT
  USING (
    auth.uid() = user_id  -- Missions qui me sont assignées
    OR 
    auth.uid() = assigned_by  -- Missions que j'ai assignées à d'autres
    OR
    EXISTS (  -- Missions dont je suis le propriétaire
      SELECT 1 FROM missions 
      WHERE missions.id = mission_assignments.mission_id 
      AND missions.user_id = auth.uid()
    )
  );

-- POLICY INSERT: Créer des assignations pour mes missions ou celles que j'ai assignées
CREATE POLICY "insert_assignments" ON mission_assignments
  FOR INSERT
  WITH CHECK (
    auth.uid() = assigned_by  -- Je dois être celui qui assigne
    AND (
      -- La mission doit m'appartenir ou m'avoir été assignée
      EXISTS (
        SELECT 1 FROM missions 
        WHERE missions.id = mission_assignments.mission_id 
        AND (missions.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM mission_assignments ma2
          WHERE ma2.mission_id = missions.id
          AND ma2.user_id = auth.uid()
        ))
      )
    )
  );

-- POLICY UPDATE: Modifier les assignations des missions qu'on gère
CREATE POLICY "update_assignments" ON mission_assignments
  FOR UPDATE
  USING (
    auth.uid() = assigned_by  -- Ceux que j'ai assignés
    OR 
    auth.uid() = user_id  -- Ceux qui me sont assignés
    OR
    EXISTS (  -- Mes missions
      SELECT 1 FROM missions 
      WHERE missions.id = mission_assignments.mission_id 
      AND missions.user_id = auth.uid()
    )
  );

-- POLICY DELETE: Supprimer les assignations des missions qu'on gère
CREATE POLICY "delete_assignments" ON mission_assignments
  FOR DELETE
  USING (
    auth.uid() = assigned_by  -- Ceux que j'ai assignés
    OR
    EXISTS (  -- Mes missions
      SELECT 1 FROM missions 
      WHERE missions.id = mission_assignments.mission_id 
      AND missions.user_id = auth.uid()
    )
  );

-- Vérifier que tout est OK
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd
FROM pg_policies 
WHERE tablename = 'mission_assignments'
ORDER BY policyname;
