-- Migration: Ajout des nouveaux champs d'inspection
-- Date: 2025-10-17
-- Description: Ajoute propreté, équipements, et conditions de photo

-- Ajout des colonnes à la table vehicle_inspections
ALTER TABLE vehicle_inspections
ADD COLUMN IF NOT EXISTS external_cleanliness VARCHAR(50) DEFAULT 'propre',
ADD COLUMN IF NOT EXISTS internal_cleanliness VARCHAR(50) DEFAULT 'propre',
ADD COLUMN IF NOT EXISTS has_spare_wheel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_repair_kit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS photo_time VARCHAR(50) DEFAULT 'jour',
ADD COLUMN IF NOT EXISTS photo_location VARCHAR(50) DEFAULT 'parking',
ADD COLUMN IF NOT EXISTS photo_weather VARCHAR(50) DEFAULT 'beau-temps';

-- Commentaires pour documentation
COMMENT ON COLUMN vehicle_inspections.external_cleanliness IS 'Propreté externe: tres-propre, propre, moyen, sale, tres-sale';
COMMENT ON COLUMN vehicle_inspections.internal_cleanliness IS 'Propreté interne: tres-propre, propre, moyen, sale, tres-sale';
COMMENT ON COLUMN vehicle_inspections.has_spare_wheel IS 'Roue de secours présente';
COMMENT ON COLUMN vehicle_inspections.has_repair_kit IS 'Kit de réparation présent';
COMMENT ON COLUMN vehicle_inspections.photo_time IS 'Moment des photos: jour, nuit, aube-crepuscule';
COMMENT ON COLUMN vehicle_inspections.photo_location IS 'Lieu des photos: parking, interieur, exterieur';
COMMENT ON COLUMN vehicle_inspections.photo_weather IS 'Météo lors des photos: beau-temps, nuageux, pluie, neige';

-- Afficher le résultat
SELECT 'Migration terminée: Nouveaux champs ajoutés avec succès' AS status;
