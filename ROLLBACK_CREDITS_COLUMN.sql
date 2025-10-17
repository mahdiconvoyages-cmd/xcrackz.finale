-- ROLLBACK: Suppression et recréation propre de la colonne credits
-- Date: 2025-10-17
-- Description: Nettoie les doublons et recrée la colonne credits correctement

-- 1. Vérifier l'état actuel
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'credits';

-- 2. Sauvegarder les valeurs actuelles (au cas où)
-- CREATE TEMP TABLE credits_backup AS
-- SELECT id, email, credits FROM profiles WHERE credits IS NOT NULL;

-- 3. Supprimer complètement la colonne credits
ALTER TABLE profiles
DROP COLUMN IF EXISTS credits CASCADE;

-- 4. Recréer la colonne credits proprement
ALTER TABLE profiles
ADD COLUMN credits INTEGER DEFAULT 0 CHECK (credits >= 0);

-- 5. Restaurer vos crédits (remplacez VOTRE_EMAIL)
UPDATE profiles 
SET credits = 1450 
WHERE email = 'VOTRE_EMAIL_ICI';

-- 6. Vérifier que tout est OK
SELECT id, email, full_name, credits 
FROM profiles 
ORDER BY credits DESC 
LIMIT 10;

-- Afficher le résultat
SELECT 'Rollback terminé: Colonne credits recréée proprement' AS status;
