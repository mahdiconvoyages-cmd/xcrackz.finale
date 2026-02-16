-- ============================================
-- DIAGNOSTIC RAPIDE : Policies RLS et Missions
-- ============================================

-- 1️⃣ Vérifier la structure de la table missions
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'missions' 
  AND column_name IN ('user_id', 'assigned_to_user_id', 'assigned_driver_id')
ORDER BY column_name;

-- 2️⃣ Vérifier les policies sur la table missions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️ Voir'
    WHEN cmd = 'INSERT' THEN '➕ Créer'
    WHEN cmd = 'UPDATE' THEN '✏️ Modifier'
    WHEN cmd = 'DELETE' THEN '🗑️ Supprimer'
  END as operation,
  qual as condition_using,
  with_check as condition_with_check
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY cmd, policyname;

-- 3️⃣ Vérifier les policies sur mission_assignments
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as condition_using,
  with_check as condition_with_check
FROM pg_policies
WHERE tablename = 'mission_assignments'
ORDER BY cmd, policyname;

-- 4️⃣ Test : Compter les missions avec assigned_to_user_id rempli
SELECT 
  COUNT(*) as total_missions,
  COUNT(assigned_to_user_id) as missions_assignees,
  COUNT(DISTINCT assigned_to_user_id) as users_uniques_assignes
FROM missions;

-- 5️⃣ Test : Compter les assignments dans mission_assignments
SELECT 
  COUNT(*) as total_assignments,
  COUNT(DISTINCT user_id) as users_uniques,
  COUNT(DISTINCT mission_id) as missions_uniques
FROM mission_assignments;

-- 6️⃣ Vérifier si RLS est activé
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('missions', 'mission_assignments')
  AND schemaname = 'public';
