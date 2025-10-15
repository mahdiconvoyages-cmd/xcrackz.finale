-- ============================================
-- FIX MISSION_ASSIGNMENTS TABLE
-- Date : 11 octobre 2025
-- Problème : Deux définitions différentes de la table
-- Solution : Supprimer l'ancienne et recréer la nouvelle
-- ============================================

-- 1. SUPPRIMER L'ANCIENNE TABLE
DROP TABLE IF EXISTS mission_assignments CASCADE;

-- 2. RECRÉER LA NOUVELLE TABLE
CREATE TABLE mission_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  
  -- Paiement
  payment_ht DECIMAL(10, 2) DEFAULT 0.00,
  commission DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Informations
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  
  -- Métadonnées
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte : Un contact ne peut pas être assigné plusieurs fois à la même mission
  UNIQUE(mission_id, contact_id)
);

-- 3. COMMENTAIRES
COMMENT ON TABLE mission_assignments IS 'Assignations de missions aux contacts de l''équipe';
COMMENT ON COLUMN mission_assignments.payment_ht IS 'Montant HT payé au contact pour cette mission';
COMMENT ON COLUMN mission_assignments.commission IS 'Commission prélevée sur la mission';
COMMENT ON COLUMN mission_assignments.status IS 'Statut de l''assignation';

-- 4. INDEX
CREATE INDEX idx_mission_assignments_mission ON mission_assignments(mission_id);
CREATE INDEX idx_mission_assignments_contact ON mission_assignments(contact_id);
CREATE INDEX idx_mission_assignments_user ON mission_assignments(user_id);
CREATE INDEX idx_mission_assignments_status ON mission_assignments(status);

-- 5. TRIGGER : MAJ updated_at
CREATE TRIGGER update_mission_assignments_updated_at
  BEFORE UPDATE ON mission_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE mission_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT : Voir ses propres assignations
CREATE POLICY "Users can view own assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT : Créer une assignation
CREATE POLICY "Users can create own assignments"
  ON mission_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE : Modifier ses propres assignations
CREATE POLICY "Users can update own assignments"
  ON mission_assignments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE : Supprimer ses propres assignations
CREATE POLICY "Users can delete own assignments"
  ON mission_assignments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- VÉRIFICATIONS
-- ============================================

SELECT 'Table mission_assignments recréée avec succès !' as message;

-- Vérifier les colonnes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mission_assignments'
ORDER BY ordinal_position;
