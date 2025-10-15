-- ============================================
-- NETTOYAGE POLICIES mission_assignments
-- Date : 11 octobre 2025
-- Objectif : Supprimer toutes les policies dupliquées
-- ============================================

-- Supprimer TOUTES les policies existantes
DROP POLICY IF EXISTS "Voir ses assignations" ON mission_assignments;
DROP POLICY IF EXISTS "Créer assignation" ON mission_assignments;
DROP POLICY IF EXISTS "Modifier assignation" ON mission_assignments;
DROP POLICY IF EXISTS "Supprimer assignation" ON mission_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can create own assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can update own assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can delete own assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Drivers can update their assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can manage own mission assignments" ON mission_assignments;

-- ============================================
-- RECRÉER LES 4 POLICIES CORRECTES
-- ============================================

-- 1. SELECT : Voir ses propres assignations
CREATE POLICY "Users can view own assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. INSERT : Créer une assignation
CREATE POLICY "Users can create own assignments"
  ON mission_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. UPDATE : Modifier ses propres assignations
CREATE POLICY "Users can update own assignments"
  ON mission_assignments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. DELETE : Supprimer ses propres assignations
CREATE POLICY "Users can delete own assignments"
  ON mission_assignments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- VÉRIFICATIONS
-- ============================================

SELECT 'Nettoyage policies terminé !' as message;

-- Vérifier les policies (devrait afficher exactement 4)
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'mission_assignments'
ORDER BY policyname;

SELECT COUNT(*) as nombre_policies
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'mission_assignments';
