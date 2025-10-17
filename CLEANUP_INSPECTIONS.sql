-- ============================================================================
-- SCRIPT DE NETTOYAGE ET RÉORGANISATION COMPLÈTE
-- Exécutez ce script dans le SQL Editor de Supabase
-- ============================================================================

-- 1. ANALYSE DE LA SITUATION ACTUELLE
-- ============================================================================
SELECT '=== ÉTAT ACTUEL ===' as section;

-- Compter les inspections dans vehicle_inspections
SELECT 
  'vehicle_inspections' as table_name,
  COUNT(*) as total,
  COUNT(DISTINCT mission_id) as missions_uniques,
  SUM(CASE WHEN inspection_type = 'departure' THEN 1 ELSE 0 END) as departs,
  SUM(CASE WHEN inspection_type = 'arrival' THEN 1 ELSE 0 END) as arrivees
FROM vehicle_inspections;

-- Compter les photos
SELECT 
  'inspection_photos' as table_name,
  COUNT(*) as total_photos,
  COUNT(DISTINCT inspection_id) as inspections_avec_photos
FROM inspection_photos;

-- Voir la distribution des photos par inspection
SELECT 
  'Photos par inspection' as info,
  vi.id as inspection_id,
  vi.mission_id,
  vi.inspection_type,
  vi.created_at,
  COUNT(ip.id) as photo_count
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.created_at
HAVING COUNT(ip.id) > 0
ORDER BY vi.created_at DESC;

-- 2. IDENTIFIER LES DOUBLONS
-- ============================================================================
SELECT '=== DOUBLONS ===' as section;

-- Trouver les inspections en double (même mission_id + inspection_type)
WITH duplicates AS (
  SELECT 
    mission_id,
    inspection_type,
    COUNT(*) as count,
    array_agg(id ORDER BY created_at DESC) as inspection_ids,
    array_agg(created_at ORDER BY created_at DESC) as dates
  FROM vehicle_inspections
  GROUP BY mission_id, inspection_type
  HAVING COUNT(*) > 1
)
SELECT 
  'Doublons trouvés' as info,
  mission_id,
  inspection_type,
  count as nombre_doublons,
  inspection_ids,
  dates
FROM duplicates;

-- 3. PLAN DE NETTOYAGE
-- ============================================================================
SELECT '=== PLAN DE NETTOYAGE ===' as section;

-- Pour chaque doublon, on garde la plus récente avec photos, sinon la plus récente
WITH duplicates AS (
  SELECT 
    mission_id,
    inspection_type,
    COUNT(*) as count,
    array_agg(id ORDER BY created_at DESC) as inspection_ids
  FROM vehicle_inspections
  GROUP BY mission_id, inspection_type
  HAVING COUNT(*) > 1
),
inspections_with_photo_count AS (
  SELECT 
    vi.id,
    vi.mission_id,
    vi.inspection_type,
    vi.created_at,
    COUNT(ip.id) as photo_count
  FROM vehicle_inspections vi
  LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
  GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.created_at
),
to_keep AS (
  SELECT DISTINCT ON (mission_id, inspection_type)
    id as keep_id
  FROM inspections_with_photo_count
  ORDER BY mission_id, inspection_type, photo_count DESC, created_at DESC
)
SELECT 
  'Inspections à supprimer' as action,
  vi.id,
  vi.mission_id,
  vi.inspection_type,
  vi.created_at,
  COUNT(ip.id) as photos
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE vi.id NOT IN (SELECT keep_id FROM to_keep)
  AND EXISTS (
    SELECT 1 FROM vehicle_inspections vi2
    WHERE vi2.mission_id = vi.mission_id
      AND vi2.inspection_type = vi.inspection_type
      AND vi2.id != vi.id
  )
GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.created_at
ORDER BY vi.mission_id, vi.inspection_type, vi.created_at;

-- ============================================================================
-- 4. EXÉCUTION DU NETTOYAGE (DÉCOMMENTER POUR EXÉCUTER)
-- ============================================================================

-- ATTENTION: Vérifiez d'abord les résultats ci-dessus avant d'exécuter cette partie !
-- Décommentez les lignes ci-dessous pour exécuter le nettoyage

/*
-- Supprimer les doublons (garder la plus récente avec le plus de photos)
WITH duplicates AS (
  SELECT 
    mission_id,
    inspection_type,
    COUNT(*) as count
  FROM vehicle_inspections
  GROUP BY mission_id, inspection_type
  HAVING COUNT(*) > 1
),
inspections_with_photo_count AS (
  SELECT 
    vi.id,
    vi.mission_id,
    vi.inspection_type,
    vi.created_at,
    COUNT(ip.id) as photo_count
  FROM vehicle_inspections vi
  LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
  WHERE EXISTS (
    SELECT 1 FROM duplicates d 
    WHERE d.mission_id = vi.mission_id 
    AND d.inspection_type = vi.inspection_type
  )
  GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.created_at
),
to_keep AS (
  SELECT DISTINCT ON (mission_id, inspection_type)
    id as keep_id
  FROM inspections_with_photo_count
  ORDER BY mission_id, inspection_type, photo_count DESC, created_at DESC
)
DELETE FROM vehicle_inspections
WHERE id IN (
  SELECT id FROM inspections_with_photo_count
  WHERE id NOT IN (SELECT keep_id FROM to_keep)
);

SELECT 'Nettoyage terminé!' as status;
*/

-- 5. VÉRIFICATION FINALE
-- ============================================================================
SELECT '=== VÉRIFICATION FINALE ===' as section;

-- État après nettoyage
SELECT 
  'Résumé final' as info,
  (SELECT COUNT(*) FROM vehicle_inspections) as total_inspections,
  (SELECT COUNT(*) FROM inspection_photos) as total_photos,
  (SELECT COUNT(DISTINCT mission_id) FROM vehicle_inspections) as missions_uniques;

-- Inspections avec leurs photos
SELECT 
  vi.mission_id,
  vi.inspection_type,
  vi.created_at,
  COUNT(ip.id) as photos,
  array_agg(ip.photo_type ORDER BY ip.created_at) as types_photos
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.created_at
ORDER BY vi.created_at DESC;
