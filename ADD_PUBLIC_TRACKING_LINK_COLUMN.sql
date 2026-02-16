-- Ajouter la colonne public_tracking_link à la table missions
-- Cette colonne stocke le token unique pour le partage public du tracking

-- Ajouter la colonne si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'missions' 
    AND column_name = 'public_tracking_link'
  ) THEN
    ALTER TABLE missions 
    ADD COLUMN public_tracking_link TEXT;
    
    RAISE NOTICE 'Column public_tracking_link added successfully';
  ELSE
    RAISE NOTICE 'Column public_tracking_link already exists';
  END IF;
END $$;

-- Créer un index pour recherche rapide par token
CREATE INDEX IF NOT EXISTS idx_missions_public_tracking_link 
ON missions(public_tracking_link);

-- Vérifier la structure de la table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'missions' 
AND column_name = 'public_tracking_link';
