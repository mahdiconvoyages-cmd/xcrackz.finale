/*
  # Correction et ajout du nom client dans les inspections

  1. Modifications
    - Ajout du champ `client_name` pour stocker le nom du client qui signe
    - Ce champ sera utilisé avec `client_signature` pour l'inspection

  2. Sécurité
    - Les politiques RLS existantes continuent de s'appliquer
*/

-- Ajouter le champ client_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicle_inspections' AND column_name = 'client_name'
  ) THEN
    ALTER TABLE vehicle_inspections ADD COLUMN client_name text;
  END IF;
END $$;
