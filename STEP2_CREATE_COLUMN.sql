-- ============================================
-- ÉTAPE 2: CRÉER LA COLONNE (si nécessaire)
-- ============================================
-- Exécutez APRÈS avoir vu les résultats de l'étape 1

-- Créer assigned_to_user_id si elle n'existe pas
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Créer l'index
CREATE INDEX IF NOT EXISTS idx_missions_assigned_to_user 
ON missions(assigned_to_user_id);

-- Si assigned_user_id existe, copier les données
UPDATE missions 
SET assigned_to_user_id = assigned_user_id
WHERE assigned_user_id IS NOT NULL
AND assigned_to_user_id IS NULL;

-- Vérifier le résultat
SELECT 
    'Colonnes après création:' as info,
    column_name
FROM information_schema.columns
WHERE table_name = 'missions'
AND column_name LIKE '%assign%'
ORDER BY column_name;
