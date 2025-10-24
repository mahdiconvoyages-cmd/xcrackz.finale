-- ================================================
-- AJOUTER LA COLONNE assigned_to_user_id À LA TABLE missions
-- ================================================
-- Cette colonne est nécessaire pour le système d'assignation collaborative

-- 1. Vérifier si la colonne existe déjà
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'missions'
AND column_name = 'assigned_to_user_id';

-- 2. Ajouter la colonne si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'missions' 
    AND column_name = 'assigned_to_user_id'
  ) THEN
    ALTER TABLE missions 
    ADD COLUMN assigned_to_user_id uuid REFERENCES auth.users(id);
    
    RAISE NOTICE 'Colonne assigned_to_user_id ajoutée';
  ELSE
    RAISE NOTICE 'Colonne assigned_to_user_id existe déjà';
  END IF;
END $$;

-- 3. Ajouter un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_missions_assigned_to_user_id 
ON missions(assigned_to_user_id);

-- 4. Vérifier la structure finale
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'missions'
AND column_name IN ('user_id', 'assigned_to_user_id')
ORDER BY column_name;

SELECT '✅ Colonne assigned_to_user_id créée/vérifiée avec succès' as status;
