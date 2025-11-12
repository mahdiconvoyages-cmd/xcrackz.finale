-- ================================================
-- VÉRIFIER ET CORRIGER LES RLS POLICIES
-- Pour permettre la lecture des missions assignées
-- ================================================

-- 1. Vérifier les policies existantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY policyname;

-- 2. Désactiver temporairement RLS pour debug (ATTENTION: réactiver après)
-- ALTER TABLE public.missions DISABLE ROW LEVEL SECURITY;

-- 3. Ajouter une policy pour lire les missions assignées
DROP POLICY IF EXISTS "Users can read missions assigned to them" ON public.missions;

CREATE POLICY "Users can read missions assigned to them"
ON public.missions
FOR SELECT
USING (
  auth.uid() = user_id OR auth.uid() = assigned_user_id
);

-- 4. Vérifier que la policy est active
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'missions' 
  AND policyname = 'Users can read missions assigned to them';

-- 5. Tester la lecture des missions assignées
SELECT 
  id,
  reference,
  user_id,
  assigned_user_id,
  status,
  share_code
FROM public.missions
WHERE assigned_user_id = auth.uid()
LIMIT 5;
