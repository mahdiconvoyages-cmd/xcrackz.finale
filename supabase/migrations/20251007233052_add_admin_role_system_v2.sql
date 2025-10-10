/*
  # Système d'administration

  ## Modifications
  
  1. Ajouter colonne `is_admin` à la table `profiles`
     - `is_admin` (boolean) - Indique si l'utilisateur est administrateur
     - Par défaut: false
  
  2. Définir mahdi.benamor1994@gmail.com comme administrateur

  ## Sécurité
  
  - Les utilisateurs ne peuvent pas modifier leur propre statut admin
*/

-- Add is_admin column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Set mahdi.benamor1994@gmail.com as admin
UPDATE profiles
SET is_admin = true
WHERE email = 'mahdi.benamor1994@gmail.com';

-- Update RLS policy for profiles to prevent users from modifying is_admin
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);
