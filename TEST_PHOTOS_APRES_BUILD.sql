-- ==========================================
-- TEST RAPIDE APRÈS INSTALLATION DU BUILD
-- ==========================================

-- 1. Compter les photos des 5 dernières minutes
SELECT 
  'Photos uploaded in last 5 min' as test,
  COUNT(*) as count,
  MAX(created_at) as last_photo_time
FROM inspection_photos_v2
WHERE created_at > NOW() - INTERVAL '5 minutes';

-- 2. Voir les dernières photos insérées
SELECT 
  id,
  inspection_id,
  photo_type,
  LEFT(full_url, 60) as url_preview,
  created_at
FROM inspection_photos_v2
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier la dernière inspection créée
SELECT 
  id,
  mission_id,
  inspection_type,
  created_at,
  (SELECT COUNT(*) FROM inspection_photos_v2 WHERE inspection_id = vi.id) as photo_count
FROM vehicle_inspections vi
ORDER BY created_at DESC
LIMIT 1;

-- ==========================================
-- RÉSULTATS ATTENDUS APRÈS TEST
-- ==========================================

-- Si ça fonctionne :
-- Test 1 : count = 6 ou 7 (nombre de photos prises)
-- Test 2 : 6-7 lignes avec les photos récentes
-- Test 3 : photo_count = 6 ou 7 (pas 0 !)

-- Si ça ne fonctionne PAS :
-- Test 1 : count = 0
-- Test 2 : Aucune photo récente
-- Test 3 : photo_count = 0
