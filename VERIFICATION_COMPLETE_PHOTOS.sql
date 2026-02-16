-- ==========================================
-- VÉRIFICATION COMPLÈTE DU SYSTÈME PHOTOS
-- ==========================================

-- 1. Vérifier la structure de la table inspection_photos_v2
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inspection_photos_v2'
ORDER BY ordinal_position;

-- 2. Vérifier si la table inspection_photos_v2 EXISTE
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name IN ('inspection_photos', 'inspection_photos_v2');

-- 3. Vérifier les policies sur inspection_photos_v2
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'inspection_photos_v2';

-- 4. Vérifier les dernières inspections créées
SELECT 
  id,
  mission_id,
  inspection_type,
  created_at,
  photo_count
FROM vehicle_inspections
ORDER BY created_at DESC
LIMIT 5;

-- 5. Vérifier les photos dans inspection_photos_v2 (table réelle)
SELECT 
  id,
  inspection_id,
  photo_type,
  LEFT(full_url, 60) as url_preview,
  created_at
FROM inspection_photos_v2
ORDER BY created_at DESC
LIMIT 10;

-- 6. Vérifier les fichiers dans le Storage
SELECT 
  name,
  bucket_id,
  created_at,
  ROUND((metadata->>'size')::numeric / 1024, 2) as size_kb
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
ORDER BY created_at DESC
LIMIT 10;

-- 7. DIAGNOSTIC: Comparer Storage vs DB pour la dernière inspection
WITH latest_inspection AS (
  SELECT id, created_at
  FROM vehicle_inspections
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  'Files in Storage' as source,
  COUNT(*) as count
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
AND created_at >= (SELECT created_at FROM latest_inspection)

UNION ALL

SELECT 
  'Rows in DB (inspection_photos_v2)' as source,
  COUNT(*) as count
FROM inspection_photos_v2
WHERE inspection_id = (SELECT id FROM latest_inspection);

-- 8. Vérifier les permissions utilisateur actuel
SELECT 
  current_user as current_db_user,
  session_user,
  current_database();

-- 9. Tester INSERT manuel (pour vérifier les permissions)
-- ATTENTION: Remplacer les valeurs par des vraies!
-- INSERT INTO inspection_photos_v2 (inspection_id, photo_type, full_url)
-- VALUES ('VOTRE-INSPECTION-ID', 'test', 'https://test.com/test.jpg')
-- RETURNING *;

-- 10. Vérifier si la colonne photo_count est calculée automatiquement
SELECT 
  vi.id,
  vi.photo_count as photo_count_in_table,
  (SELECT COUNT(*) FROM inspection_photos_v2 WHERE inspection_id = vi.id) as photo_count_real
FROM vehicle_inspections vi
ORDER BY vi.created_at DESC
LIMIT 5;
