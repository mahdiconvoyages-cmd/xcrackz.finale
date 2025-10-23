-- ============================================
-- FIX URGENT : Activer RLS sur table missions
-- Date : 22 octobre 2025
-- Problème : RLS désactivé sur missions (rls_enabled = false)
-- ============================================

-- 🚨 PROBLÈME IDENTIFIÉ :
-- La table missions n'a PAS Row Level Security activé !
-- Cela signifie que TOUS les users peuvent voir TOUTES les missions
-- (ou aucune si aucune policy existe)

-- ============================================
-- ÉTAPE 1 : ACTIVER RLS
-- ============================================

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 2 : SUPPRIMER ANCIENNES POLICIES (si existent)
-- ============================================

DROP POLICY IF EXISTS "Users can view own missions" ON missions;
DROP POLICY IF EXISTS "Users can view created or assigned missions" ON missions;
DROP POLICY IF EXISTS "Users can create missions" ON missions;
DROP POLICY IF EXISTS "Users can update own missions" ON missions;
DROP POLICY IF EXISTS "Users can update created or assigned missions" ON missions;
DROP POLICY IF EXISTS "Users can delete own missions" ON missions;
DROP POLICY IF EXISTS "Users can insert own missions" ON missions;

-- ============================================
-- ÉTAPE 3 : CRÉER POLICIES CORRECTES
-- ============================================

-- 👁️ SELECT : Voir missions créées OU assignées
CREATE POLICY "missions_select_policy"
  ON missions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()              -- Missions que j'ai créées
    OR 
    assigned_to_user_id = auth.uid()  -- Missions qui me sont assignées
  );

-- ➕ INSERT : Créer des missions (user_id doit être = auth.uid())
CREATE POLICY "missions_insert_policy"
  ON missions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ✏️ UPDATE : Modifier missions créées OU assignées
CREATE POLICY "missions_update_policy"
  ON missions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()              -- Missions que j'ai créées
    OR 
    assigned_to_user_id = auth.uid()  -- Missions qui me sont assignées
  )
  WITH CHECK (
    user_id = auth.uid()              -- On peut seulement modifier nos propres missions créées
    OR 
    assigned_to_user_id = auth.uid()  -- Ou les missions assignées (pour changer le statut)
  );

-- 🗑️ DELETE : Supprimer uniquement ses propres missions créées
CREATE POLICY "missions_delete_policy"
  ON missions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- ÉTAPE 4 : VÉRIFICATION
-- ============================================

-- Lister les policies créées
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️ Voir'
    WHEN cmd = 'INSERT' THEN '➕ Créer'
    WHEN cmd = 'UPDATE' THEN '✏️ Modifier'
    WHEN cmd = 'DELETE' THEN '🗑️ Supprimer'
  END as description
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY cmd;

-- Vérifier RLS activé
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ ACTIVÉ'
    ELSE '❌ DÉSACTIVÉ'
  END as status
FROM pg_tables
WHERE tablename = 'missions'
  AND schemaname = 'public';

-- ============================================
-- ÉTAPE 5 : AJOUTER COLONNE assigned_to_user_id SI MANQUANTE
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id'
  ) THEN
    ALTER TABLE missions 
    ADD COLUMN assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_missions_assigned_to_user 
    ON missions(assigned_to_user_id);
    
    RAISE NOTICE '✅ Colonne assigned_to_user_id créée avec index';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne assigned_to_user_id existe déjà';
  END IF;
END $$;

-- ============================================
-- ✅ TERMINÉ
-- ============================================

-- Résultat attendu :
-- 1. RLS activé sur missions
-- 2. 4 policies créées (SELECT, INSERT, UPDATE, DELETE)
-- 3. Users voient uniquement :
--    - Missions qu'ils ont créées (user_id = auth.uid())
--    - Missions qui leur sont assignées (assigned_to_user_id = auth.uid())
