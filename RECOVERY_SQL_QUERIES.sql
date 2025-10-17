-- 🔍 IDENTIFIER LES INSPECTIONS SANS PHOTOS - Pour récupération
-- À exécuter dans Supabase SQL Editor
-- Date: 2025-10-16

-- ===============================================
-- 1. LISTER LES INSPECTIONS QUI ONT BESOIN DE PHOTOS
-- ===============================================

-- 📋 ÉTAPE 1: Exécutez cette requête pour identifier les 4 inspections sans photos
SELECT 
  vi.id,
  vi.mission_id,
  vi.inspection_type,
  vi.created_at,
  vi.client_name,
  'NEEDS_PHOTOS' as status
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE ip.inspection_id IS NULL
  AND vi.status = 'completed'
ORDER BY vi.created_at DESC;

-- ===============================================
-- 1bis. LISTER LES PHOTOS EXISTANTES POUR COMPARAISON
-- ===============================================

-- 📋 ÉTAPE 2: Voir quelles photos existent déjà (les 6 qui ont survécu)
SELECT 
  ip.id,
  ip.inspection_id,
  ip.photo_type,
  ip.photo_url,
  ip.created_at,
  vi.mission_id,
  vi.inspection_type as inspection_type
FROM inspection_photos ip
JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
ORDER BY ip.created_at DESC;

-- ===============================================
-- 2. TEMPLATE POUR RÉCUPÉRATION MANUELLE
-- ===============================================

-- 🔄 Si vous trouvez des fichiers dans Storage, utilisez ce template:
-- Remplacez les valeurs par les vraies données trouvées

/*
EXEMPLE DE RÉCUPÉRATION (à adapter):

INSERT INTO inspection_photos (
  inspection_id,
  photo_type, 
  photo_url,
  uploaded_by,
  created_at
) VALUES 
-- Répétez pour chaque photo trouvée
('INSPECTION_ID_1', 'arrival_front', 'https://xxx.supabase.co/storage/v1/object/public/inspection-photos/inspections/FICHIER1.jpg', 'RECOVERY', NOW()),
('INSPECTION_ID_1', 'arrival_back', 'https://xxx.supabase.co/storage/v1/object/public/inspection-photos/inspections/FICHIER2.jpg', 'RECOVERY', NOW()),
('INSPECTION_ID_2', 'departure_front', 'https://xxx.supabase.co/storage/v1/object/public/inspection-photos/inspections/FICHIER3.jpg', 'RECOVERY', NOW());

*/

-- ===============================================
-- 3. VÉRIFICATION POST-RÉCUPÉRATION
-- ===============================================

-- 📊 À exécuter après récupération pour vérifier le succès
SELECT 
  'APRÈS RÉCUPÉRATION' as status,
  (SELECT COUNT(*) FROM vehicle_inspections) as total_inspections,
  (SELECT COUNT(*) FROM inspection_photos) as total_photos,
  (SELECT COUNT(*) FROM vehicle_inspections vi 
   LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id 
   WHERE ip.inspection_id IS NULL AND vi.status = 'completed') as inspections_still_missing_photos;

-- ✅ Objectif: inspections_still_missing_photos devrait être 0