-- ================================================
-- VÉRIFIER ET RECRÉER LA COLONNE assigned_to_user_id
-- ================================================

-- 1. Vérifier toutes les colonnes de missions
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'missions'
ORDER BY ordinal_position;

-- 2. Supprimer la colonne si elle existe (pour la recréer proprement)
ALTER TABLE missions DROP COLUMN IF EXISTS assigned_to_user_id CASCADE;

-- 3. Recréer la colonne
ALTER TABLE missions ADD COLUMN assigned_to_user_id uuid;

-- 4. Ajouter la contrainte de clé étrangère
ALTER TABLE missions 
ADD CONSTRAINT fk_missions_assigned_to_user 
FOREIGN KEY (assigned_to_user_id) 
REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Créer l'index
CREATE INDEX IF NOT EXISTS idx_missions_assigned_to_user_id 
ON missions(assigned_to_user_id);

-- 6. FORCER LE REFRESH DU SCHÉMA (Important!)
NOTIFY pgrst, 'reload schema';

-- 7. Vérification finale
SELECT 
  'VÉRIFICATION FINALE' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'missions'
AND column_name = 'assigned_to_user_id';

SELECT '✅ Colonne assigned_to_user_id recréée et schéma rechargé' as status;
