-- ================================================
-- CRÉER DES POLITIQUES TRÈS PERMISSIVES
-- (Alternative quand on ne peut pas désactiver RLS)
-- ================================================

-- 1. SUPPRIMER TOUTES LES ANCIENNES POLITIQUES
DROP POLICY IF EXISTS "storage_all_buckets" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_public" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_public" ON storage.objects;
DROP POLICY IF EXISTS "allow_all_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vehicle images" ON storage.objects;

-- 2. CRÉER UNE POLITIQUE ULTRA-PERMISSIVE
-- Autoriser TOUTES les opérations pour les utilisateurs authentifiés
CREATE POLICY "allow_all_authenticated_users" ON storage.objects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. CRÉER UNE POLITIQUE POUR LES ANONYMES (lecture seule sur buckets publics)
CREATE POLICY "allow_public_read" ON storage.objects
FOR SELECT
TO anon
USING (bucket_id IN ('avatars', 'vehicle-images', 'inspection-photos', 'company-logos', 'user-documents', 'missions'));

-- 4. RENDRE TOUS LES BUCKETS PUBLICS
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
UPDATE storage.buckets SET public = true WHERE id = 'vehicle-images';
UPDATE storage.buckets SET public = true WHERE id = 'inspection-photos';
UPDATE storage.buckets SET public = true WHERE id = 'company-logos';
UPDATE storage.buckets SET public = true WHERE id = 'user-documents';
UPDATE storage.buckets SET public = true WHERE id = 'missions';

-- 5. VÉRIFIER LES POLITIQUES
SELECT 
  policyname,
  cmd,
  roles::text as roles,
  SUBSTRING(qual::text, 1, 50) as using_clause,
  SUBSTRING(with_check::text, 1, 50) as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

SELECT '✅ Politiques permissives créées - Testez upload maintenant !' as status;
