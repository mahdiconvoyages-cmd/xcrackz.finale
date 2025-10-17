-- Migration: Ajout colonne credits dans profiles
-- Date: 2025-10-17
-- Description: Ajoute la colonne credits pour le système de crédits xCrackz

-- Ajout de la colonne credits
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0 CHECK (credits >= 0);

-- Mettre à jour les utilisateurs existants avec 10 crédits gratuits
UPDATE profiles 
SET credits = 10 
WHERE credits IS NULL OR credits = 0;

-- Commentaire
COMMENT ON COLUMN profiles.credits IS 'Crédits xCrackz disponibles pour le covoiturage et autres services premium';

-- Afficher le résultat
SELECT 'Migration terminée: Colonne credits ajoutée avec succès' AS status;
