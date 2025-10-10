/*
  # Ajout champs utilisateur type et adresse

  ## Description
  Ajout des champs nécessaires pour différencier les types d'utilisateurs
  (convoyeur vs donneur d'ordre) et stocker leur adresse complète.

  ## Modifications
  
  ### Table `profiles`
  - `user_type` (text) - Type d'utilisateur: 'convoyeur' ou 'donneur_ordre'
  - `address` (text) - Adresse complète de l'utilisateur
  
  ## Notes
  - Tous les utilisateurs ont les mêmes droits
  - Les convoyeurs sont automatiquement ajoutés dans les contacts comme chauffeurs
  - Le téléphone est obligatoire pour pouvoir ajouter un utilisateur aux contacts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN user_type text DEFAULT 'donneur_ordre';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address text;
  END IF;
END $$;