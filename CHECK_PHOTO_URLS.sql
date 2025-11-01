-- ============================================
-- VÉRIFIER URLS DES PHOTOS
-- ============================================

-- 1. Photos avec URLs NULL
SELECT 
  'URLs NULL' as issue,
  COUNT(*) as count,
  array_agg(id) as photo_ids
FROM inspection_photos_v2
WHERE full_url IS NULL;

-- 2. Photos récentes (dernières 10)
SELECT 
  id,
  inspection_id,
  photo_type,
  full_url,
  created_at
FROM inspection_photos_v2
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier une inspection spécifique avec ses photos
SELECT 
  vi.id as inspection_id,
  vi.inspection_type,
  vi.created_at as inspection_date,
  COUNT(ip.id) as photo_count,
  array_agg(ip.full_url) as photo_urls
FROM vehicle_inspections vi
LEFT JOIN inspection_photos_v2 ip ON ip.inspection_id = vi.id
GROUP BY vi.id
ORDER BY vi.created_at DESC
LIMIT 5;

-- 4. Comparer old vs v2
SELECT 
  'Comparaison old vs v2' as info,
  old.id,
  old.photo_url as old_url,
  v2.full_url as v2_url,
  CASE 
    WHEN old.photo_url = v2.full_url THEN '✅ Identique'
    ELSE '❌ Différent'
  END as status
FROM inspection_photos_old old
FULL OUTER JOIN inspection_photos_v2 v2 ON old.id = v2.id
WHERE old.photo_url != v2.full_url OR v2.full_url IS NULL
LIMIT 10;
