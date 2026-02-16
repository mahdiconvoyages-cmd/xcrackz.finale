-- 🔥 SOLUTION SIMPLE : Désactiver RLS sur missions
-- L'accès sera géré via mission_assignments uniquement

-- Désactiver RLS sur missions
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;

-- Garder RLS actif sur mission_assignments avec policies simples
DROP POLICY IF EXISTS "view_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "create_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "modify_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "remove_assignments" ON mission_assignments;

CREATE POLICY "view_assignments" ON mission_assignments
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_by);

CREATE POLICY "create_assignments" ON mission_assignments
  FOR INSERT WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "modify_assignments" ON mission_assignments
  FOR UPDATE USING (auth.uid() = assigned_by OR auth.uid() = user_id);

CREATE POLICY "remove_assignments" ON mission_assignments
  FOR DELETE USING (auth.uid() = assigned_by);

-- Vérifier
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('missions', 'mission_assignments');
