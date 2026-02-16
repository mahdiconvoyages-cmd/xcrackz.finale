-- ============================================
-- DIAGNOSTIC PHOTOS NON CHARGÉES
-- ============================================

-- 1. Vérifier la vue inspection_photos
SELECT 
  '📋 Structure de la vue' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'inspection_photos'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Vérifier les données retournées par la vue
SELECT 
  '📸 Sample photos via vue' as info,
  id,
  inspection_id,
  photo_type,
  photo_url,
  created_at
FROM inspection_photos
ORDER BY created_at DESC
LIMIT 5;

-- 3. Vérifier les données dans v2
SELECT 
  '📸 Sample photos dans v2' as info,
  id,
  inspection_id,
  photo_type,
  full_url,
  thumbnail_url,
  created_at
FROM inspection_photos_v2
ORDER BY created_at DESC
LIMIT 5;

-- 4. Compter les photos
SELECT 
  '📊 Counts' as info,
  (SELECT COUNT(*) FROM inspection_photos) as via_vue,
  (SELECT COUNT(*) FROM inspection_photos_v2) as dans_v2;

-- 5. Vérifier la définition de la vue
SELECT pg_get_viewdef('inspection_photos', true) as view_definition;
