-- ================================================
-- DEBUG : Analyser pourquoi certains rapports marchent et d'autres non
-- ================================================

-- 1. VÉRIFIER LES MISSIONS AVEC INSPECTIONS
SELECT 
  m.id,
  m.reference,
  m.vehicle_brand,
  m.vehicle_model,
  COUNT(DISTINCT vi.id) FILTER (WHERE vi.inspection_type = 'departure') as nb_departure,
  COUNT(DISTINCT vi.id) FILTER (WHERE vi.inspection_type = 'arrival') as nb_arrival,
  CASE 
    WHEN COUNT(DISTINCT vi.id) FILTER (WHERE vi.inspection_type = 'departure') > 0 
      OR COUNT(DISTINCT vi.id) FILTER (WHERE vi.inspection_type = 'arrival') > 0 
    THEN 'OUI'
    ELSE 'NON'
  END as a_des_inspections
FROM missions m
LEFT JOIN vehicle_inspections vi ON vi.mission_id = m.id
GROUP BY m.id, m.reference, m.vehicle_brand, m.vehicle_model
ORDER BY m.created_at DESC
LIMIT 20;

-- 2. VÉRIFIER LES TOKENS DE PARTAGE EXISTANTS
SELECT 
  irs.id,
  irs.share_token,
  irs.mission_id,
  m.reference as mission_ref,
  irs.is_active,
  irs.created_at,
  irs.access_count
FROM inspection_report_shares irs
JOIN missions m ON m.id = irs.mission_id
ORDER BY irs.created_at DESC
LIMIT 10;

-- 3. VÉRIFIER UNE MISSION SPÉCIFIQUE (remplace ID)
-- SELECT * FROM vehicle_inspections WHERE mission_id = 'UUID_ICI';

-- 4. TESTER LA FONCTION RPC DIRECTEMENT
-- SELECT get_inspection_report_by_token('TOKEN_ICI');

-- 5. VÉRIFIER LES PHOTOS
SELECT 
  vi.id as inspection_id,
  vi.mission_id,
  m.reference,
  vi.inspection_type,
  COUNT(ip.id) as nb_photos
FROM vehicle_inspections vi
JOIN missions m ON m.id = vi.mission_id
LEFT JOIN inspection_photos_v2 ip ON ip.inspection_id = vi.id
GROUP BY vi.id, vi.mission_id, m.reference, vi.inspection_type
ORDER BY vi.created_at DESC
LIMIT 20;
