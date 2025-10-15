-- ============================================
-- FIX RLS : Missions Assignées Visibles
-- Date : 11 octobre 2025
-- Architecture Simplifiée : user_id (créateur) + assigned_to_user_id (destinataire)
-- ============================================

-- PROBLÈME:
-- Les users ne voient que les missions qu'ils ont créées (user_id = auth.uid())
-- Ils ne voient PAS les missions qui leur sont assignées

-- SOLUTION:
-- 1. Ajouter colonne assigned_to_user_id (si n'existe pas)
-- 2. Ajouter policy pour voir missions assignées

-- ============================================
-- 1. AJOUTER COLONNE assigned_to_user_id
-- ============================================

-- Ajouter colonne si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id'
  ) THEN
    ALTER TABLE missions 
    ADD COLUMN assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Colonne assigned_to_user_id créée';
  ELSE
    RAISE NOTICE 'Colonne assigned_to_user_id existe déjà';
  END IF;
END $$;

-- Créer index pour performance
CREATE INDEX IF NOT EXISTS idx_missions_assigned_to_user 
ON missions(assigned_to_user_id);

-- ============================================
-- 2. SUPPRIMER ANCIENNES POLICIES RESTRICTIVES
-- ============================================

DROP POLICY IF EXISTS "Users can view own missions" ON missions;
DROP POLICY IF EXISTS "Users can update own missions" ON missions;
DROP POLICY IF EXISTS "Users can delete own missions" ON missions;
DROP POLICY IF EXISTS "Users can insert own missions" ON missions;

-- ============================================
-- 3. CRÉER NOUVELLE POLICY POUR SELECT
-- ============================================

-- Policy: Users peuvent voir missions créées OU assignées
CREATE POLICY "Users can view created or assigned missions"
  ON missions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()              -- Missions créées
    OR 
    assigned_to_user_id = auth.uid()  -- Missions assignées
  );

-- ============================================
-- 4. POLICY POUR INSERT (Créer mission)
-- ============================================

CREATE POLICY "Users can create missions"
  ON missions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 5. POLICY POUR UPDATE (Modifier mission)
-- ============================================

-- User peut modifier missions qu'il a créées OU qui lui sont assignées
CREATE POLICY "Users can update created or assigned missions"
  ON missions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()              -- Missions créées
    OR 
    assigned_to_user_id = auth.uid()  -- Missions assignées
  )
  WITH CHECK (
    user_id = auth.uid()              -- Missions créées
    OR 
    assigned_to_user_id = auth.uid()  -- Missions assignées
  );

-- ============================================
-- 6. POLICY POUR DELETE (Supprimer mission)
-- ============================================

-- Seul le créateur peut supprimer
CREATE POLICY "Users can delete own missions"
  ON missions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- VÉRIFICATIONS
-- ============================================

SELECT '✅ RLS Policies mises à jour !' as message;

-- Vérifier la nouvelle colonne
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'missions' 
  AND column_name IN ('user_id', 'assigned_to_user_id')
ORDER BY column_name;

-- Vérifier les policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'missions'
ORDER BY policyname;

-- ============================================
-- TEST MANUEL
-- ============================================

/*
-- User A crée mission
INSERT INTO missions (user_id, reference, vehicle_brand, vehicle_model, pickup_address, delivery_address, ...)
VALUES (auth.uid(), 'MIS-001', 'Toyota', 'Corolla', 'Paris', 'Lyon', ...);

-- User A assigne à User B
UPDATE missions
SET assigned_to_user_id = 'user-B-uuid'
WHERE id = 'mission-uuid';

-- User B se connecte
SELECT * FROM missions WHERE assigned_to_user_id = auth.uid();
-- ✅ Devrait voir la mission

-- User A se connecte
SELECT * FROM missions WHERE user_id = auth.uid();
-- ✅ Devrait voir la mission
*/

-- ============================================
-- NETTOYAGE (OPTIONNEL)
-- ============================================

-- Si des policies liées à mission_assignments existent encore et créent des conflits:
-- DROP POLICY IF EXISTS "..." ON mission_assignments;

-- Si mission_assignments n'est plus utilisée:
-- DROP TABLE IF EXISTS mission_assignments CASCADE;

SELECT '✅ Script terminé avec succès !' as final_message;
