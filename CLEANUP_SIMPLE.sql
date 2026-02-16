-- ============================================================================
-- NETTOYAGE AUTOMATIQUE DES DOUBLONS
-- Ce script supprime les doublons en gardant la meilleure version
-- ============================================================================

-- ÉTAPE 1: Voir ce qui va être supprimé
SELECT 
  'Inspections qui seront SUPPRIMÉES' as action,
  vi.id,
  vi.mission_id,
  vi.inspection_type,
  vi.created_at,
  COUNT(ip.id) as photos
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE vi.id NOT IN (
  -- Garder seulement la meilleure version par (mission_id, inspection_type)
  SELECT DISTINCT ON (mission_id, inspection_type) id
  FROM (
    SELECT 
      vi2.id,
      vi2.mission_id,
      vi2.inspection_type,
      vi2.created_at,
      COUNT(ip2.id) as photo_count
    FROM vehicle_inspections vi2
    LEFT JOIN inspection_photos ip2 ON ip2.inspection_id = vi2.id
    GROUP BY vi2.id, vi2.mission_id, vi2.inspection_type, vi2.created_at
  ) as inspections_with_counts
  ORDER BY mission_id, inspection_type, photo_count DESC, created_at DESC
)
GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.created_at
ORDER BY vi.mission_id, vi.created_at DESC;

-- ÉTAPE 2: Voir ce qui va être GARDÉ
SELECT 
  'Inspections qui seront GARDÉES' as action,
  vi.id,
  vi.mission_id,
  vi.inspection_type,
  vi.created_at,
  COUNT(ip.id) as photos,
  array_agg(ip.photo_type ORDER BY ip.created_at) as types
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE vi.id IN (
  SELECT DISTINCT ON (mission_id, inspection_type) id
  FROM (
    SELECT 
      vi2.id,
      vi2.mission_id,
      vi2.inspection_type,
      vi2.created_at,
      COUNT(ip2.id) as photo_count
    FROM vehicle_inspections vi2
    LEFT JOIN inspection_photos ip2 ON ip2.inspection_id = vi2.id
    GROUP BY vi2.id, vi2.mission_id, vi2.inspection_type, vi2.created_at
  ) as inspections_with_counts
  ORDER BY mission_id, inspection_type, photo_count DESC, created_at DESC
)
GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.created_at
ORDER BY vi.mission_id, vi.created_at DESC;

-- ============================================================================
-- ÉTAPE 3: EXÉCUTER LE NETTOYAGE
-- ============================================================================

DELETE FROM vehicle_inspections
WHERE id NOT IN (
  SELECT DISTINCT ON (mission_id, inspection_type) id
  FROM (
    SELECT 
      vi.id,
      vi.mission_id,
      vi.inspection_type,
      vi.created_at,
      COUNT(ip.id) as photo_count
    FROM vehicle_inspections vi
    LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
    GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.created_at
  ) as inspections_with_counts
  ORDER BY mission_id, inspection_type, photo_count DESC, created_at DESC
);

SELECT 
  '✅ NETTOYAGE TERMINÉ!' as status,
  COUNT(*) as inspections_restantes
FROM vehicle_inspections;

-- ÉTAPE 4: VÉRIFICATION
SELECT 
  'Résumé' as info,
  mission_id,
  inspection_type,
  COUNT(*) as nombre_inspections,
  SUM(CASE WHEN photo_count > 0 THEN 1 ELSE 0 END) as avec_photos
FROM (
  SELECT 
    vi.id,
    vi.mission_id,
    vi.inspection_type,
    COUNT(ip.id) as photo_count
  FROM vehicle_inspections vi
  LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
  GROUP BY vi.id, vi.mission_id, vi.inspection_type
) as summary
GROUP BY mission_id, inspection_type
ORDER BY mission_id, inspection_type;
