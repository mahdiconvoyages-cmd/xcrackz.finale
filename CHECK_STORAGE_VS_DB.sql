-- ============================================
-- VÉRIFIER STORAGE vs DATABASE
-- ============================================

-- 1. Photos dans le bucket inspection-photos
SELECT 
  '📦 Storage inspection-photos' as source,
  name as file_path,
  created_at,
  metadata->>'size' as file_size
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Photos dans inspection_photos_v2 créées aujourd'hui
SELECT 
  '💾 Database v2 (aujourd''hui)' as source,
  id,
  inspection_id,
  photo_type,
  full_url,
  created_at
FROM inspection_photos_v2
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- 3. Photos dans inspection_photos_old créées aujourd'hui
SELECT 
  '💾 Database old (aujourd''hui)' as source,
  id,
  inspection_id,
  photo_type,
  photo_url,
  created_at
FROM inspection_photos_old
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- 4. Vérifier les logs RLS (si disponibles)
-- Compter total photos par source
SELECT 
  'TOTAL COUNTS' as info,
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'inspection-photos') as storage_count,
  (SELECT COUNT(*) FROM inspection_photos_v2) as v2_count,
  (SELECT COUNT(*) FROM inspection_photos_old) as old_count;

-- 5. Dernières inspections avec tentatives de photos
SELECT 
  vi.id,
  vi.inspection_type,
  vi.created_at,
  vi.updated_at,
  COUNT(DISTINCT so.id) as files_in_storage
FROM vehicle_inspections vi
LEFT JOIN storage.objects so ON so.name LIKE '%' || vi.id::text || '%'
WHERE vi.created_at::date = CURRENT_DATE
GROUP BY vi.id
ORDER BY vi.created_at DESC;
