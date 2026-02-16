-- ================================================
-- CRÉER POLITIQUES SUR LES BUCKETS INDIVIDUELS
-- ================================================

-- 1. SUPPRIMER LES ANCIENNES POLITIQUES SUR BUCKETS (si elles existent)
DROP POLICY IF EXISTS "avatars_allow_all" ON storage.buckets;
DROP POLICY IF EXISTS "vehicle_images_allow_all" ON storage.buckets;
DROP POLICY IF EXISTS "inspection_photos_allow_all" ON storage.buckets;
DROP POLICY IF EXISTS "missions_allow_all" ON storage.buckets;
DROP POLICY IF EXISTS "company_logos_allow_all" ON storage.buckets;
DROP POLICY IF EXISTS "user_documents_allow_all" ON storage.buckets;

-- 2. CRÉER UNE POLITIQUE GLOBALE POUR TOUS LES BUCKETS
CREATE POLICY "buckets_allow_all_authenticated" ON storage.buckets
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 3. VÉRIFIER LES POLITIQUES SUR BUCKETS
SELECT 
  'POLITIQUES SUR storage.buckets' as info,
  policyname,
  cmd,
  roles::text,
  SUBSTRING(qual::text, 1, 80) as using_clause,
  SUBSTRING(with_check::text, 1, 80) as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'buckets';

-- 4. VÉRIFIER LES POLITIQUES SUR OBJECTS
SELECT 
  'POLITIQUES SUR storage.objects' as info,
  policyname,
  cmd,
  roles::text,
  SUBSTRING(qual::text, 1, 80) as using_clause,
  SUBSTRING(with_check::text, 1, 80) as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

-- 5. VÉRIFIER LES BUCKETS
SELECT 
  'BUCKETS' as info,
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets
ORDER BY name;

SELECT '✅ Politique globale créée sur storage.buckets' as status;
