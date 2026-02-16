/*
  # Ajouter prénom et nom séparés aux profils

  ## Modifications
  
  1. Ajouter colonnes `first_name` et `last_name` à la table `profiles`
     - `first_name` (text) - Prénom de l'utilisateur
     - `last_name` (text) - Nom de l'utilisateur
  
  2. Migrer les données existantes de `full_name` vers `first_name` et `last_name`
*/

-- Add first_name and last_name columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_name text;
  END IF;
END $$;

-- Migrate existing full_name data to first_name
UPDATE profiles
SET first_name = SPLIT_PART(full_name, ' ', 1),
    last_name = CASE 
      WHEN full_name LIKE '% %' THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
      ELSE ''
    END
WHERE full_name IS NOT NULL AND first_name IS NULL;
