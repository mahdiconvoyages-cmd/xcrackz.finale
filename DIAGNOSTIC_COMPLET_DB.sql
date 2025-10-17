-- 🔍 DIAGNOSTIC COMPLET BASE DE DONNÉES - DÉTECTION D'INCOHÉRENCES
-- EXÉCUTER dans Supabase SQL Editor
-- Date: 2025-10-16

-- ===============================================
-- 1. INSPECTIONS ORPHELINES (sans mission)
-- ===============================================
SELECT 
  '⚠️ INSPECTIONS ORPHELINES' as probleme,
  vi.id as inspection_id,
  vi.mission_id,
  vi.inspection_type,
  vi.status,
  vi.created_at
FROM vehicle_inspections vi
LEFT JOIN missions m ON m.id = vi.mission_id
WHERE m.id IS NULL;

-- ===============================================
-- 2. PHOTOS ORPHELINES (sans inspection)
-- ===============================================
SELECT 
  '⚠️ PHOTOS ORPHELINES' as probleme,
  ip.id as photo_id,
  ip.inspection_id,
  ip.photo_type,
  ip.created_at
FROM inspection_photos ip
LEFT JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
WHERE vi.id IS NULL;

-- ===============================================
-- 3. INSPECTIONS SANS INSPECTEUR
-- ===============================================
SELECT 
  '⚠️ INSPECTIONS SANS INSPECTEUR' as probleme,
  id as inspection_id,
  mission_id,
  inspection_type,
  status,
  created_at
FROM vehicle_inspections
WHERE inspector_id IS NULL;

-- ===============================================
-- 4. DOUBLONS D'INSPECTIONS (même mission + même type)
-- ===============================================
SELECT 
  '⚠️ DOUBLONS INSPECTIONS' as probleme,
  mission_id,
  inspection_type,
  COUNT(*) as nombre_doublons,
  STRING_AGG(id::text, ', ') as inspection_ids
FROM vehicle_inspections
GROUP BY mission_id, inspection_type
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ===============================================
-- 5. INSPECTIONS COMPLÉTÉES SANS PHOTOS
-- ===============================================
SELECT 
  '⚠️ INSPECTIONS COMPLÉTÉES SANS PHOTOS' as probleme,
  vi.id as inspection_id,
  vi.inspection_type,
  vi.status,
  vi.created_at,
  COUNT(ip.id) as photo_count
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE vi.status = 'completed'
GROUP BY vi.id, vi.inspection_type, vi.status, vi.created_at
HAVING COUNT(ip.id) = 0;

-- ===============================================
-- 6. MISSIONS SANS INSPECTIONS
-- ===============================================
SELECT 
  '⚠️ MISSIONS SANS INSPECTIONS' as probleme,
  m.id as mission_id,
  m.reference,
  m.status,
  m.created_at
FROM missions m
LEFT JOIN vehicle_inspections vi ON vi.mission_id = m.id
WHERE vi.id IS NULL
ORDER BY m.created_at DESC;

-- ===============================================
-- 7. INCOHÉRENCES DE STATUT (mission terminée sans inspections complètes)
-- ===============================================
SELECT 
  '⚠️ MISSION TERMINÉE SANS INSPECTIONS COMPLÈTES' as probleme,
  m.id as mission_id,
  m.reference,
  m.status as mission_status,
  COUNT(DISTINCT CASE WHEN vi.inspection_type = 'departure' THEN vi.id END) as inspections_depart,
  COUNT(DISTINCT CASE WHEN vi.inspection_type = 'arrival' THEN vi.id END) as inspections_arrivee
FROM missions m
LEFT JOIN vehicle_inspections vi ON vi.mission_id = m.id
WHERE m.status = 'completed'
GROUP BY m.id, m.reference, m.status
HAVING 
  COUNT(DISTINCT CASE WHEN vi.inspection_type = 'departure' THEN vi.id END) = 0 OR
  COUNT(DISTINCT CASE WHEN vi.inspection_type = 'arrival' THEN vi.id END) = 0;

-- ===============================================
-- 8. PHOTOS AVEC URL CASSÉES (domaine incorrect)
-- ===============================================
SELECT 
  '⚠️ PHOTOS AVEC URL SUSPECTES' as probleme,
  id as photo_id,
  inspection_id,
  photo_type,
  photo_url,
  CASE 
    WHEN photo_url NOT LIKE '%supabase.co%' THEN 'URL non Supabase'
    WHEN photo_url NOT LIKE '%inspection-photos%' THEN 'Mauvais bucket'
    ELSE 'Autre problème'
  END as type_probleme
FROM inspection_photos
WHERE 
  photo_url IS NULL OR
  photo_url NOT LIKE '%supabase.co%' OR
  photo_url NOT LIKE '%inspection-photos%';

-- ===============================================
-- 9. INSPECTIONS EN COURS DEPUIS PLUS DE 24H
-- ===============================================
SELECT 
  '⚠️ INSPECTIONS BLOQUÉES EN IN_PROGRESS' as probleme,
  id as inspection_id,
  mission_id,
  inspection_type,
  status,
  created_at,
  NOW() - created_at as duree
FROM vehicle_inspections
WHERE status = 'in_progress'
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at;

-- ===============================================
-- 10. RÉSUMÉ GLOBAL
-- ===============================================
SELECT 
  '📊 RÉSUMÉ GLOBAL' as info,
  (SELECT COUNT(*) FROM missions) as total_missions,
  (SELECT COUNT(*) FROM vehicle_inspections) as total_inspections,
  (SELECT COUNT(*) FROM inspection_photos) as total_photos,
  (SELECT COUNT(*) FROM vehicle_inspections WHERE status = 'completed') as inspections_completees,
  (SELECT COUNT(*) FROM vehicle_inspections WHERE status = 'in_progress') as inspections_en_cours,
  (SELECT COUNT(DISTINCT mission_id) FROM vehicle_inspections) as missions_avec_inspections,
  (SELECT COUNT(*) FROM missions WHERE status = 'completed') as missions_completees;

-- ===============================================
-- 11. DÉTAILS PAR INSPECTION (vue complète)
-- ===============================================
SELECT 
  '📋 VUE COMPLÈTE INSPECTIONS' as info,
  vi.id as inspection_id,
  vi.mission_id,
  m.reference as mission_ref,
  vi.inspection_type,
  vi.inspector_id,
  au.email as inspecteur_email,
  vi.status as inspection_status,
  m.status as mission_status,
  COUNT(ip.id) as nombre_photos,
  vi.created_at,
  vi.completed_at,
  CASE 
    WHEN vi.inspector_id IS NULL THEN '❌ Pas d''inspecteur'
    WHEN vi.mission_id IS NOT NULL AND m.id IS NULL THEN '❌ Mission inexistante'
    WHEN vi.status = 'completed' AND COUNT(ip.id) = 0 THEN '⚠️ Complétée sans photos'
    WHEN COUNT(ip.id) > 0 THEN '✅ OK avec ' || COUNT(ip.id) || ' photos'
    ELSE '⚠️ En cours'
  END as statut
FROM vehicle_inspections vi
LEFT JOIN missions m ON m.id = vi.mission_id
LEFT JOIN auth.users au ON au.id = vi.inspector_id
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
GROUP BY vi.id, vi.mission_id, m.reference, vi.inspection_type, vi.inspector_id, 
         au.email, vi.status, m.status, vi.created_at, vi.completed_at, m.id
ORDER BY vi.created_at DESC;

-- ===============================================
-- 12. VÉRIFICATION INTÉGRITÉ RÉFÉRENTIELLE
-- ===============================================
SELECT 
  '🔍 VÉRIFICATION CONTRAINTES' as info,
  COUNT(CASE WHEN vi.mission_id IS NOT NULL AND m.id IS NULL THEN 1 END) as fk_mission_cassees,
  COUNT(CASE WHEN vi.inspector_id IS NOT NULL AND au.id IS NULL THEN 1 END) as fk_inspecteur_cassees,
  COUNT(CASE WHEN ip.inspection_id IS NOT NULL AND vi.id IS NULL THEN 1 END) as fk_inspection_photo_cassees
FROM vehicle_inspections vi
FULL OUTER JOIN missions m ON m.id = vi.mission_id
FULL OUTER JOIN auth.users au ON au.id = vi.inspector_id
FULL OUTER JOIN inspection_photos ip ON ip.inspection_id = vi.id;