-- Migration: Migrer les photos de inspections vers vehicle_inspections
-- Cette migration crée une correspondance entre les anciennes et nouvelles inspections
-- basée sur mission_id et inspection_type

-- Étape 1: Créer une table temporaire pour mapper les anciennes IDs vers les nouvelles
CREATE TEMP TABLE inspection_id_mapping AS
SELECT 
  old_insp.id as old_inspection_id,
  new_insp.id as new_inspection_id,
  old_insp.mission_id,
  old_insp.inspection_type
FROM inspections old_insp
INNER JOIN vehicle_inspections new_insp 
  ON old_insp.mission_id = new_insp.mission_id 
  AND old_insp.inspection_type = new_insp.inspection_type;

-- Étape 2: Afficher le mapping (pour vérification)
SELECT 
  COUNT(*) as total_mappings,
  COUNT(DISTINCT old_inspection_id) as old_inspections,
  COUNT(DISTINCT new_inspection_id) as new_inspections
FROM inspection_id_mapping;

-- Étape 3: Mettre à jour les inspection_id dans inspection_photos
UPDATE inspection_photos ip
SET inspection_id = mapping.new_inspection_id
FROM inspection_id_mapping mapping
WHERE ip.inspection_id = mapping.old_inspection_id;

-- Étape 4: Vérifier le résultat
SELECT 
  'Photos migrées' as status,
  COUNT(*) as photos_count,
  COUNT(DISTINCT inspection_id) as unique_inspections
FROM inspection_photos
WHERE inspection_id IN (SELECT id FROM vehicle_inspections);

-- Étape 5: Afficher les photos orphelines (qui n'ont pas pu être migrées)
SELECT 
  'Photos orphelines' as status,
  COUNT(*) as photos_count
FROM inspection_photos
WHERE inspection_id NOT IN (SELECT id FROM vehicle_inspections);
