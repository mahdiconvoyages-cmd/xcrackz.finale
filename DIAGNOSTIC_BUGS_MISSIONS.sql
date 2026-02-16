-- ===================================
-- DIAGNOSTIC BUGS MISSIONS - 2025-11-06
-- ===================================
-- Résolution des bugs rapportés:
-- 1. Missions terminées compteur à 0
-- 2. Photos de livraison manquantes
-- 3. App qui beugue pendant missions

-- ===================================
-- 1. VÉRIFIER MISSIONS TERMINÉES
-- ===================================

-- Compter les missions par statut
SELECT 
  status,
  COUNT(*) as nombre
FROM missions
GROUP BY status
ORDER BY nombre DESC;

-- Trouver les missions avec inspections complètes
SELECT 
  m.id,
  m.reference,
  m.status,
  m.departure_inspection_completed,
  m.arrival_inspection_completed,
  m.created_at
FROM missions m
WHERE m.departure_inspection_completed = true 
  AND m.arrival_inspection_completed = true
ORDER BY m.created_at DESC
LIMIT 10;

-- Compter les missions qui devraient être 'completed'
SELECT COUNT(*) as missions_avec_deux_inspections
FROM missions
WHERE departure_inspection_completed = true 
  AND arrival_inspection_completed = true
  AND status != 'completed';

-- ===================================
-- 2. VÉRIFIER PHOTOS DE LIVRAISON
-- ===================================

-- Compter les photos par inspection
SELECT 
  vi.id as inspection_id,
  vi.inspection_type,
  m.reference as mission_ref,
  COUNT(ip.id) as nombre_photos_v2,
  m.status
FROM vehicle_inspections vi
LEFT JOIN missions m ON vi.mission_id = m.id
LEFT JOIN inspection_photos_v2 ip ON ip.inspection_id = vi.id
WHERE vi.inspection_type = 'arrival'
GROUP BY vi.id, vi.inspection_type, m.reference, m.status
ORDER BY vi.created_at DESC
LIMIT 10;

-- Vérifier les photos dans le storage vs la base
SELECT 
  ip.id,
  ip.inspection_id,
  ip.photo_type,
  ip.full_url,
  ip.taken_at,
  vi.inspection_type
FROM inspection_photos_v2 ip
JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
WHERE vi.inspection_type = 'arrival'
ORDER BY ip.taken_at DESC
LIMIT 20;

-- ===================================
-- 3. DIAGNOSTIC STATE & CRASHES
-- ===================================

-- Missions en cours (in_progress) avec détails
SELECT 
  m.id,
  m.reference,
  m.status,
  m.departure_inspection_completed,
  m.arrival_inspection_completed,
  v.brand || ' ' || v.model as vehicule,
  m.created_at,
  m.updated_at
FROM missions m
LEFT JOIN vehicles v ON m.vehicle_id = v.id
WHERE m.status = 'in_progress'
ORDER BY m.created_at DESC;

-- Vérifier les inspections sans photos
SELECT 
  vi.id,
  vi.inspection_type,
  vi.mission_id,
  m.reference,
  COUNT(ip.id) as photos_count
FROM vehicle_inspections vi
JOIN missions m ON vi.mission_id = m.id
LEFT JOIN inspection_photos_v2 ip ON ip.inspection_id = vi.id
GROUP BY vi.id, vi.inspection_type, vi.mission_id, m.reference
HAVING COUNT(ip.id) = 0
ORDER BY vi.created_at DESC
LIMIT 10;

-- ===================================
-- SOLUTION 1: METTRE À JOUR STATUS
-- ===================================
-- ⚠️ NE PAS EXÉCUTER SANS VÉRIFICATION
-- Cette requête corrige automatiquement le statut

-- UPDATE missions 
-- SET status = 'completed'
-- WHERE departure_inspection_completed = true 
--   AND arrival_inspection_completed = true
--   AND status != 'completed';

-- ===================================
-- SOLUTION 2: VÉRIFIER VIEW PHOTOS
-- ===================================

-- Recréer la view si elle pose problème
DROP VIEW IF EXISTS inspection_photos CASCADE;

CREATE OR REPLACE VIEW inspection_photos AS
SELECT 
  ip.id,
  ip.inspection_id,
  ip.photo_type,
  ip.full_url as photo_url,
  ip.thumbnail_url,
  ip.taken_at as created_at
FROM inspection_photos_v2 ip;

GRANT SELECT ON inspection_photos TO authenticated;

-- ===================================
-- RÉSUMÉ FINAL
-- ===================================

SELECT 
  'Missions total' as categorie,
  COUNT(*) as nombre
FROM missions
UNION ALL
SELECT 
  'Missions completed',
  COUNT(*)
FROM missions WHERE status = 'completed'
UNION ALL
SELECT 
  'Missions in_progress',
  COUNT(*)
FROM missions WHERE status = 'in_progress'
UNION ALL
SELECT 
  'Inspections départ',
  COUNT(*)
FROM vehicle_inspections WHERE inspection_type = 'departure'
UNION ALL
SELECT 
  'Inspections arrivée',
  COUNT(*)
FROM vehicle_inspections WHERE inspection_type = 'arrival'
UNION ALL
SELECT 
  'Photos total',
  COUNT(*)
FROM inspection_photos_v2
UNION ALL
SELECT 
  'Photos arrivée',
  COUNT(*)
FROM inspection_photos_v2 ip
JOIN vehicle_inspections vi ON ip.inspection_id = vi.id
WHERE vi.inspection_type = 'arrival';
