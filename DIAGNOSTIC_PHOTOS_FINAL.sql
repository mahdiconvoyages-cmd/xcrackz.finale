-- ==========================================
-- DIAGNOSTIC SIMPLE - PHOTOS
-- ==========================================

-- 1. Vérifier si inspection_photos_v2 existe
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name IN ('inspection_photos', 'inspection_photos_v2');

-- 2. Structure de inspection_photos_v2
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'inspection_photos_v2'
ORDER BY ordinal_position;

-- 3. Policies sur inspection_photos_v2
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'inspection_photos_v2';

-- 4. Compter les photos dans inspection_photos_v2
SELECT COUNT(*) as total_photos
FROM inspection_photos_v2;

-- 5. Les 5 dernières inspections
SELECT 
  id,
  mission_id,
  inspection_type,
  created_at
FROM vehicle_inspections
ORDER BY created_at DESC
LIMIT 5;

-- 6. Les 10 dernières photos uploadées
SELECT 
  id,
  inspection_id,
  photo_type,
  created_at
FROM inspection_photos_v2
ORDER BY created_at DESC
LIMIT 10;

-- 7. Fichiers dans Storage (10 derniers)
SELECT 
  name,
  created_at
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
ORDER BY created_at DESC
LIMIT 10;

-- 8. DIAGNOSTIC: Pour chaque inspection récente, compter les photos
SELECT 
  vi.id as inspection_id,
  vi.inspection_type,
  vi.created_at as inspection_created,
  COUNT(ip.id) as photos_in_db,
  (
    SELECT COUNT(*) 
    FROM storage.objects 
    WHERE bucket_id = 'inspection-photos' 
    AND name LIKE CONCAT(vi.id::text, '%')
  ) as files_in_storage
FROM vehicle_inspections vi
LEFT JOIN inspection_photos_v2 ip ON ip.inspection_id = vi.id
WHERE vi.created_at > NOW() - INTERVAL '24 hours'
GROUP BY vi.id, vi.inspection_type, vi.created_at
ORDER BY vi.created_at DESC
LIMIT 5;
