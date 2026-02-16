-- ============================================
-- AJOUT DES CHAMPS SIGNATURE CONVOYEUR
-- ============================================

-- Ajouter les colonnes pour la signature du convoyeur
ALTER TABLE vehicle_inspections
ADD COLUMN IF NOT EXISTS driver_name TEXT,
ADD COLUMN IF NOT EXISTS driver_signature TEXT;

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN vehicle_inspections.driver_name IS 'Nom complet du convoyeur qui effectue l''inspection';
COMMENT ON COLUMN vehicle_inspections.driver_signature IS 'Signature du convoyeur en format base64';

-- Vérifier que les colonnes sont bien ajoutées
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections'
AND column_name IN ('driver_name', 'driver_signature', 'client_name', 'client_signature');
