-- ==========================================
-- DIAGNOSTIC PHOTOS NON UPLOADÉES
-- ==========================================

-- 1. Vérifier les inspections récentes
SELECT 
  id,
  mission_id,
  inspection_type,
  created_at,
  (SELECT COUNT(*) FROM inspection_photos WHERE inspection_id = vi.id) as photo_count
FROM vehicle_inspections vi
ORDER BY created_at DESC
LIMIT 10;

-- 2. Vérifier les permissions du bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'inspection-photos';

-- 3. Vérifier les policies RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

-- 4. Vérifier les fichiers uploadés récemment dans le bucket
SELECT 
  id,
  name,
  bucket_id,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Vérifier les photos dans la table (avec URLs)
SELECT 
  ip.id,
  ip.inspection_id,
  ip.photo_type,
  LEFT(ip.photo_url, 80) as photo_url_preview,
  ip.uploaded_at,
  ip.created_at
FROM inspection_photos ip
ORDER BY ip.created_at DESC
LIMIT 20;

-- 6. Tester si le bucket est accessible en écriture
-- (Essayer manuellement dans l'interface Supabase Storage)

-- 7. Vérifier les quotas et limites
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(COALESCE((metadata->>'size')::bigint, 0)) as total_size_bytes,
  ROUND(SUM(COALESCE((metadata->>'size')::bigint, 0)) / 1024.0 / 1024.0, 2) as total_size_mb
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
GROUP BY bucket_id;

-- ==========================================
-- SOLUTIONS POSSIBLES
-- ==========================================

-- Si les permissions sont incorrectes, recréer les policies:

-- 1. Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;

-- 2. Créer nouvelles policies pour inspection-photos
CREATE POLICY "Allow authenticated users to upload inspection photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY "Allow authenticated users to update their inspection photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Allow public read access to inspection photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Allow authenticated users to delete their inspection photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'inspection-photos');

-- 3. S'assurer que le bucket est PUBLIC
UPDATE storage.buckets
SET public = true
WHERE id = 'inspection-photos';

-- 4. Augmenter la limite de taille si nécessaire (50MB par défaut)
UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50MB
WHERE id = 'inspection-photos';

-- ==========================================
-- VÉRIFICATION FINALE
-- ==========================================

-- Après avoir appliqué les solutions, revérifier:
SELECT 
  'Bucket config' as check_type,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'inspection-photos'

UNION ALL

SELECT 
  'Policies count' as check_type,
  COUNT(*)::text as name,
  NULL as public,
  NULL as file_size_limit,
  NULL as allowed_mime_types
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%inspection%';
