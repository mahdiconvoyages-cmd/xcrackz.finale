-- ==========================================
-- VÉRIFICATION STRUCTURE TABLES
-- ==========================================

-- 1. Structure complète de vehicle_inspections
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections'
ORDER BY ordinal_position;

-- 2. Structure de inspection_photos_v2
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inspection_photos_v2'
ORDER BY ordinal_position;

-- 3. Vérifier si inspection_photos est une VIEW
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name IN ('inspection_photos', 'inspection_photos_v2');

-- 4. Définition de la VIEW inspection_photos
SELECT definition
FROM pg_views
WHERE viewname = 'inspection_photos';

-- 5. Les dernières inspections avec comptage de photos
SELECT 
  vi.id,
  vi.mission_id,
  vi.inspection_type,
  vi.created_at,
  (SELECT COUNT(*) FROM inspection_photos_v2 WHERE inspection_id = vi.id) as photo_count_real
FROM vehicle_inspections vi
ORDER BY vi.created_at DESC
LIMIT 5;

-- 6. Les photos dans inspection_photos_v2
SELECT 
  id,
  inspection_id,
  photo_type,
  LEFT(full_url, 60) as url_preview,
  created_at
FROM inspection_photos_v2
ORDER BY created_at DESC
LIMIT 10;

-- 7. Policies sur inspection_photos_v2
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NULL THEN 'NULL'
    ELSE LEFT(qual, 50)
  END as qual_preview,
  CASE 
    WHEN with_check IS NULL THEN 'NULL'
    ELSE LEFT(with_check, 50)
  END as with_check_preview
FROM pg_policies
WHERE tablename = 'inspection_photos_v2';

-- 8. Fichiers dans Storage
SELECT 
  name,
  created_at,
  ROUND((metadata->>'size')::numeric / 1024, 2) as size_kb
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
ORDER BY created_at DESC
LIMIT 10;

-- 9. DIAGNOSTIC CRITIQUE: Comparer Storage vs DB
WITH latest_inspection AS (
  SELECT id, created_at
  FROM vehicle_inspections
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  'Files in Storage' as source,
  COUNT(*) as count,
  (SELECT id FROM latest_inspection) as inspection_id
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
AND created_at >= (SELECT created_at - interval '5 minutes' FROM latest_inspection)

UNION ALL

SELECT 
  'Rows in inspection_photos_v2' as source,
  COUNT(*) as count,
  (SELECT id FROM latest_inspection) as inspection_id
FROM inspection_photos_v2
WHERE inspection_id = (SELECT id FROM latest_inspection);
