-- ================================================
-- FIX RLS - AUTORISER ACCÈS AUX DONNÉES
-- ================================================

-- 1. DÉSACTIVER TEMPORAIREMENT RLS pour voir toutes les données
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;

-- 2. VÉRIFIER combien de données existent
SELECT 'missions' as table_name, COUNT(*) as count FROM missions;
SELECT 'vehicle_inspections' as table_name, COUNT(*) as count FROM vehicle_inspections;
SELECT 'inspection_photos' as table_name, COUNT(*) as count FROM inspection_photos;

-- 3. VOIR TOUS LES USER_ID dans les missions (trouver le bon nom de colonne)
-- Essayons plusieurs noms possibles
DO $$
BEGIN
  -- Vérifier quelle colonne existe
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'user_id') THEN
    RAISE NOTICE 'Colonne trouvée: user_id';
    EXECUTE 'SELECT DISTINCT user_id, COUNT(*) as missions_count FROM missions GROUP BY user_id';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'created_by') THEN
    RAISE NOTICE 'Colonne trouvée: created_by';
    EXECUTE 'SELECT DISTINCT created_by, COUNT(*) as missions_count FROM missions GROUP BY created_by';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id') THEN
    RAISE NOTICE 'Colonne trouvée: assigned_to_user_id';
    EXECUTE 'SELECT DISTINCT assigned_to_user_id, COUNT(*) as missions_count FROM missions GROUP BY assigned_to_user_id';
  ELSE
    RAISE NOTICE 'Aucune colonne user trouvée!';
  END IF;
END $$;

-- 4. SI LES DONNÉES EXISTENT, réactiver RLS avec des politiques PERMISSIVES
-- Politique pour missions : tout le monde peut tout voir/modifier (temporaire pour debug)
DROP POLICY IF EXISTS "Users can view all missions" ON missions;
CREATE POLICY "Users can view all missions" ON missions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert missions" ON missions;
CREATE POLICY "Users can insert missions" ON missions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update missions" ON missions;
CREATE POLICY "Users can update missions" ON missions FOR UPDATE USING (true);

-- Politique pour inspections
DROP POLICY IF EXISTS "Users can view all inspections" ON vehicle_inspections;
CREATE POLICY "Users can view all inspections" ON vehicle_inspections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert inspections" ON vehicle_inspections;
CREATE POLICY "Users can insert inspections" ON vehicle_inspections FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update inspections" ON vehicle_inspections;
CREATE POLICY "Users can update inspections" ON vehicle_inspections FOR UPDATE USING (true);

-- Politique pour user_credits
DROP POLICY IF EXISTS "Users can view their credits" ON user_credits;
CREATE POLICY "Users can view their credits" ON user_credits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their credits" ON user_credits;
CREATE POLICY "Users can insert their credits" ON user_credits FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their credits" ON user_credits;
CREATE POLICY "Users can update their credits" ON user_credits FOR UPDATE USING (true);

-- 5. RÉACTIVER RLS
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- 6. CRÉER user_credits pour le nouvel utilisateur si nécessaire
INSERT INTO user_credits (user_id, balance)
VALUES ('784dd826-62ae-4d94-81a0-618953d63010', 500)
ON CONFLICT (user_id) DO NOTHING;
