-- ================================================
-- VÉRIFIER/CRÉER LA TABLE mission_assignments
-- ================================================

-- 1. Vérifier si la table existe
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'mission_assignments';

-- 2. Afficher la structure si elle existe
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'mission_assignments'
ORDER BY ordinal_position;

-- 3. Si la table n'existe pas, la créer
CREATE TABLE IF NOT EXISTS mission_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  assigned_to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_ht numeric(10,2) DEFAULT 0,
  commission numeric(10,2) DEFAULT 0,
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Créer les index
CREATE INDEX IF NOT EXISTS idx_mission_assignments_mission_id ON mission_assignments(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_assignments_assigned_to ON mission_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_mission_assignments_assigned_by ON mission_assignments(assigned_by_user_id);

-- 5. Forcer le refresh du schéma
NOTIFY pgrst, 'reload schema';

SELECT '✅ Table mission_assignments créée/vérifiée' as status;
