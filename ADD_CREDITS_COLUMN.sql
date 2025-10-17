-- Migration: Ajout colonne credits dans profiles
-- Date: 2025-10-17
-- Description: Ajoute la colonne credits pour le système de crédits xCrackz

-- Ajout de la colonne credits (0 par défaut)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0 CHECK (credits >= 0);

-- OPTIONNEL: Donner des crédits uniquement à votre compte admin
-- Remplacez 'VOTRE_USER_ID' par votre vrai ID utilisateur
-- UPDATE profiles 
-- SET credits = 1450 
-- WHERE id = 'VOTRE_USER_ID';

-- OU donner 10 crédits gratuits à TOUS les utilisateurs existants (décommentez si souhaité)
-- UPDATE profiles 
-- SET credits = 10 
-- WHERE credits = 0;

-- Commentaire
COMMENT ON COLUMN profiles.credits IS 'Crédits xCrackz disponibles pour le covoiturage et autres services premium';

-- Afficher le résultat
SELECT 'Migration terminée: Colonne credits ajoutée avec succès' AS status;
