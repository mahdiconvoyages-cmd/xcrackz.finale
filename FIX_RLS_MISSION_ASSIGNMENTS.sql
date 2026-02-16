-- 🔧 CORRECTION RLS pour mission_assignments
-- Permet l'insertion même si contact_id est null

-- 1. Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can insert their own assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can view their assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can update their assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can delete their assignments" ON mission_assignments;

-- 2. Créer les nouvelles policies (simplifiées)

-- SELECT: Voir ses propres assignations (créées par soi OU assignées à soi)
CREATE POLICY "view_assignments" ON mission_assignments
  FOR SELECT
  USING (
    auth.uid() = assigned_by OR auth.uid() = user_id
  );

-- INSERT: N'importe qui peut créer une assignation
CREATE POLICY "insert_assignments" ON mission_assignments
  FOR INSERT
  WITH CHECK (
    auth.uid() = assigned_by  -- L'assigneur doit être l'utilisateur connecté
  );

-- UPDATE: Peut modifier si on est l'assigneur ou l'assigné
CREATE POLICY "update_assignments" ON mission_assignments
  FOR UPDATE
  USING (
    auth.uid() = assigned_by OR auth.uid() = user_id
  );

-- DELETE: Peut supprimer si on est l'assigneur
CREATE POLICY "delete_assignments" ON mission_assignments
  FOR DELETE
  USING (
    auth.uid() = assigned_by
  );

-- 3. Vérifier
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'mission_assignments';
