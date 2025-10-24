-- ================================================
-- DÉSACTIVER COMPLÈTEMENT RLS SUR STORAGE
-- ================================================

-- 1. SUPPRIMER TOUTES LES POLITIQUES
DROP POLICY IF EXISTS "storage_all_buckets" ON storage.objects;
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

-- 2. DÉSACTIVER RLS SUR STORAGE.OBJECTS
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 3. RENDRE TOUS LES BUCKETS PUBLICS
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
UPDATE storage.buckets SET public = true WHERE id = 'vehicle-images';
UPDATE storage.buckets SET public = true WHERE id = 'inspection-photos';
UPDATE storage.buckets SET public = true WHERE id = 'company-logos';
UPDATE storage.buckets SET public = true WHERE id = 'user-documents';
UPDATE storage.buckets SET public = true WHERE id = 'missions';

-- 4. VÉRIFIER
SELECT 
  'BUCKETS' as type,
  id,
  name,
  public,
  CASE WHEN rowsecurity THEN 'ACTIVÉ' ELSE 'DÉSACTIVÉ' END as rls_status
FROM storage.buckets
LEFT JOIN pg_tables ON pg_tables.tablename = 'buckets' AND pg_tables.schemaname = 'storage'
ORDER BY name;

SELECT 
  'STORAGE.OBJECTS RLS' as info,
  CASE WHEN rowsecurity THEN 'ACTIVÉ' ELSE 'DÉSACTIVÉ' END as rls_status
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'objects';

SELECT '✅ RLS DÉSACTIVÉ SUR STORAGE - Tous les buckets publics !' as status;
