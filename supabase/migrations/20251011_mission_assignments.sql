-- ============================================
-- MIGRATION MISSION_ASSIGNMENTS
-- Date : 11 octobre 2025
-- Système : Assignation de missions aux contacts
-- ============================================

-- ============================================
-- CRÉER LA TABLE mission_assignments
-- ============================================

CREATE TABLE IF NOT EXISTS mission_assignments (
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

-- Commentaires
COMMENT ON TABLE mission_assignments IS 'Assignations de missions aux contacts de l''équipe';
COMMENT ON COLUMN mission_assignments.payment_ht IS 'Montant HT payé au contact pour cette mission';
COMMENT ON COLUMN mission_assignments.commission IS 'Commission prélevée sur la mission';
COMMENT ON COLUMN mission_assignments.status IS 'Statut de l''assignation';

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_mission_assignments_mission ON mission_assignments(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_assignments_contact ON mission_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_mission_assignments_user ON mission_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_assignments_status ON mission_assignments(status);

-- ============================================
-- TRIGGER : MAJ updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_mission_assignments_updated_at ON mission_assignments;
CREATE TRIGGER update_mission_assignments_updated_at
  BEFORE UPDATE ON mission_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE mission_assignments ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Voir ses assignations" ON mission_assignments;
DROP POLICY IF EXISTS "Créer assignation" ON mission_assignments;
DROP POLICY IF EXISTS "Modifier assignation" ON mission_assignments;
DROP POLICY IF EXISTS "Supprimer assignation" ON mission_assignments;

-- Lecture : Voir ses propres assignations
CREATE POLICY "Voir ses assignations"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Création : Créer une assignation
CREATE POLICY "Créer assignation"
  ON mission_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Modification : Modifier ses propres assignations
CREATE POLICY "Modifier assignation"
  ON mission_assignments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Suppression : Supprimer ses propres assignations
CREATE POLICY "Supprimer assignation"
  ON mission_assignments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- VÉRIFICATIONS
-- ============================================

SELECT 'Migration mission_assignments terminée !' as message;

-- Vérifier la table
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'mission_assignments';

-- Vérifier les policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'mission_assignments'
ORDER BY policyname;
