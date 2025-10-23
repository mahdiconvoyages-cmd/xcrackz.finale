-- ================================================
-- DIAGNOSTIC COMPLET - POURQUOI JE NE VOIS RIEN ?
-- ================================================

-- 1. Voir TOUTES les missions (bypass RLS temporaire)
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
SELECT id, reference, status, user_id, assigned_to_user_id, created_at 
FROM missions 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Mon user ID actuel
SELECT auth.uid() as my_current_user_id;

-- 3. Combien de missions j'ai créées ?
SELECT COUNT(*) as mes_missions_creees
FROM missions 
WHERE user_id = '784dd826-62ae-4d94-81a0-618953d63010';

-- 4. Combien de missions me sont assignées ?
SELECT COUNT(*) as missions_assignees
FROM missions 
WHERE assigned_to_user_id = '784dd826-62ae-4d94-81a0-618953d63010';

-- 5. Tous les user_id différents dans missions
SELECT 
  user_id,
  COUNT(*) as nombre_missions,
  STRING_AGG(reference, ', ') as references
FROM missions 
GROUP BY user_id;

-- 6. Vérifier user_credits
ALTER TABLE user_credits DISABLE ROW LEVEL SECURITY;
SELECT * FROM user_credits;

-- 7. Voir les politiques RLS actuelles
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('missions', 'user_credits')
ORDER BY tablename, policyname;
