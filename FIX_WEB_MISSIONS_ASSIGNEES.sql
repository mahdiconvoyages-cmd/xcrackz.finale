-- ============================================
-- FIX WEB : Missions Assignées Non Visibles
-- Date : Aujourd'hui
-- Problème : Users ne voient pas les missions assignées dans la console web
-- ============================================

-- DIAGNOSTIC :
-- 1. Vérifier si la colonne assigned_to_user_id existe
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'missions' 
  AND column_name = 'assigned_to_user_id';

-- 2. Vérifier les policies RLS actuelles
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY policyname;

-- 3. Vérifier si des missions ont assigned_to_user_id rempli
SELECT 
  COUNT(*) as total_missions,
  COUNT(assigned_to_user_id) as missions_with_assignee,
  COUNT(DISTINCT assigned_to_user_id) as unique_assignees
FROM missions;

-- ============================================
-- SOLUTION : Appliquer la migration si nécessaire
-- ============================================

-- Étape 1 : Ajouter colonne assigned_to_user_id si manquante
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id'
  ) THEN
    ALTER TABLE missions 
    ADD COLUMN assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Colonne assigned_to_user_id créée';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne assigned_to_user_id existe déjà';
  END IF;
END $$;

-- Créer index pour performance
CREATE INDEX IF NOT EXISTS idx_missions_assigned_to_user 
ON missions(assigned_to_user_id);

-- ============================================
-- Étape 2 : Supprimer anciennes policies restrictives
-- ============================================

DROP POLICY IF EXISTS "Users can view own missions" ON missions;
DROP POLICY IF EXISTS "Users can update own missions" ON missions;
DROP POLICY IF EXISTS "Users can delete own missions" ON missions;
DROP POLICY IF EXISTS "Users can insert own missions" ON missions;

-- ============================================
-- Étape 3 : Créer policies correctes
-- ============================================

-- SELECT : Voir missions créées OU assignées
CREATE POLICY "Users can view created or assigned missions"
  ON missions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()              -- Missions créées
    OR 
    assigned_to_user_id = auth.uid()  -- Missions assignées
  );

-- INSERT : Créer missions
CREATE POLICY "Users can create missions"
  ON missions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE : Modifier missions créées ou assignées
CREATE POLICY "Users can update created or assigned missions"
  ON missions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR 
    assigned_to_user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR 
    assigned_to_user_id = auth.uid()
  );

-- DELETE : Supprimer (créateur uniquement)
CREATE POLICY "Users can delete own missions"
  ON missions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- Étape 4 : Vérifier le résultat
-- ============================================

-- Lister les policies créées
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Qui peut VOIR'
    WHEN cmd = 'INSERT' THEN 'Qui peut CRÉER'
    WHEN cmd = 'UPDATE' THEN 'Qui peut MODIFIER'
    WHEN cmd = 'DELETE' THEN 'Qui peut SUPPRIMER'
  END as description
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY cmd;

-- Test : Compter missions visibles pour l'utilisateur actuel
-- (À exécuter en tant qu'utilisateur connecté)
SELECT 
  'Missions créées par moi' as type,
  COUNT(*) as count
FROM missions
WHERE user_id = auth.uid()
UNION ALL
SELECT 
  'Missions assignées à moi' as type,
  COUNT(*) as count
FROM missions
WHERE assigned_to_user_id = auth.uid();
