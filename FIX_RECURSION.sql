-- 🔥 FIX RÉCURSION INFINIE : Simplifier les RLS policies

-- ========================================
-- 1. MISSIONS - Policy simple sans récursion
-- ========================================

DROP POLICY IF EXISTS "read_assigned_missions" ON missions;
DROP POLICY IF EXISTS "Users can view their own missions" ON missions;
DROP POLICY IF EXISTS "Users can insert their own missions" ON missions;
DROP POLICY IF EXISTS "Users can update their own missions" ON missions;
DROP POLICY IF EXISTS "Users can delete their own missions" ON missions;

-- Policy simple : voir ses propres missions uniquement
-- On ne vérifie PAS les assignations ici pour éviter la récursion
CREATE POLICY "view_own_missions" ON missions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_missions" ON missions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_missions" ON missions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "delete_own_missions" ON missions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 2. MISSION_ASSIGNMENTS - Policy simplifiée
-- ========================================

DROP POLICY IF EXISTS "select_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "insert_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "update_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "delete_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "select_own_assignments" ON mission_assignments;

-- SELECT: Voir ses assignations (reçues ou données)
CREATE POLICY "view_assignments" ON mission_assignments
  FOR SELECT
  USING (
    auth.uid() = user_id  -- Assignées à moi
    OR 
    auth.uid() = assigned_by  -- Que j'ai assignées
  );

-- INSERT: Créer des assignations (je dois être l'assigneur)
CREATE POLICY "create_assignments" ON mission_assignments
  FOR INSERT
  WITH CHECK (auth.uid() = assigned_by);

-- UPDATE: Modifier ses assignations
CREATE POLICY "modify_assignments" ON mission_assignments
  FOR UPDATE
  USING (
    auth.uid() = assigned_by 
    OR 
    auth.uid() = user_id
  );

-- DELETE: Supprimer ses assignations
CREATE POLICY "remove_assignments" ON mission_assignments
  FOR DELETE
  USING (auth.uid() = assigned_by);

-- ========================================
-- 3. Vérification
-- ========================================

SELECT 'MISSIONS POLICIES:' as type;
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'missions'
ORDER BY policyname;

SELECT 'ASSIGNMENTS POLICIES:' as type;
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'mission_assignments'
ORDER BY policyname;
