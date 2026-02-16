-- ============================================
-- CORRIGER LES URLs DES PHOTOS
-- ============================================
-- Remplacer qmlbmjsgmnuygrvwfuux par bfrkthzovwpjrvqktdjn

-- 1. Vérifier combien d'URLs sont mauvaises
SELECT 
  'URLs à corriger' as info,
  COUNT(*) as count
FROM inspection_photos_v2
WHERE full_url LIKE '%qmlbmjsgmnuygrvwfuux%';

-- 2. Corriger toutes les URLs
UPDATE inspection_photos_v2
SET full_url = REPLACE(
  full_url,
  'qmlbmjsgmnuygrvwfuux.supabase.co',
  'bfrkthzovwpjrvqktdjn.supabase.co'
)
WHERE full_url LIKE '%qmlbmjsgmnuygrvwfuux%';

-- 3. Vérification
SELECT 
  '✅ URLs corrigées' as status,
  COUNT(*) as total_photos,
  COUNT(CASE WHEN full_url LIKE '%bfrkthzovwpjrvqktdjn%' THEN 1 END) as correct_urls,
  COUNT(CASE WHEN full_url LIKE '%qmlbmjsgmnuygrvwfuux%' THEN 1 END) as wrong_urls
FROM inspection_photos_v2;

-- 4. Tester quelques URLs
SELECT 
  id,
  inspection_id,
  photo_type,
  full_url
FROM inspection_photos_v2
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 5;
