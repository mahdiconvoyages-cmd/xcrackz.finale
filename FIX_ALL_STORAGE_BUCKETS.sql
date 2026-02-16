-- ================================================
-- CORRIGER TOUS LES BUCKETS DE STORAGE
-- ================================================

-- 1. RENDRE TOUS LES BUCKETS PUBLICS
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
UPDATE storage.buckets SET public = true WHERE id = 'vehicle-images';
UPDATE storage.buckets SET public = true WHERE id = 'inspection-photos';
UPDATE storage.buckets SET public = true WHERE id = 'company-logos';
UPDATE storage.buckets SET public = true WHERE id = 'user-documents';

-- 2. SUPPRIMER TOUTES LES POLITIQUES RLS SUR STORAGE.OBJECTS
DROP POLICY IF EXISTS "avatars_public" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_public" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_public" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "avatar_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatar_select" ON storage.objects;
DROP POLICY IF EXISTS "avatar_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_select" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_delete" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_delete" ON storage.objects;
DROP POLICY IF EXISTS "photos_all" ON storage.objects;
DROP POLICY IF EXISTS "photos_view" ON storage.objects;
DROP POLICY IF EXISTS "photos_create" ON storage.objects;
DROP POLICY IF EXISTS "photos_policy" ON storage.objects;

-- 3. CRÉER UNE SEULE POLITIQUE SIMPLE POUR TOUS LES BUCKETS
CREATE POLICY "storage_all_buckets" ON storage.objects
FOR ALL
USING (auth.uid() IS NOT NULL OR bucket_id IN ('avatars', 'vehicle-images', 'inspection-photos', 'company-logos', 'user-documents'))
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. VÉRIFIER LES BUCKETS
SELECT 
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets
ORDER BY name;

-- 5. VÉRIFIER LES POLITIQUES STORAGE
SELECT 
  policyname,
  cmd,
  SUBSTRING(qual::text, 1, 100) as using_clause
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

SELECT '✅ Tous les buckets configurés !' as status;
