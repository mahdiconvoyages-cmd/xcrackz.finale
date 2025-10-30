-- ============================================
-- FIX STORAGE RLS POLICIES - VERSION 2 (Safe)
-- ============================================

-- 1. Supprimer TOUTES les policies d'inspection existantes
DROP POLICY IF EXISTS "Allow authenticated users to upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update inspection photos" ON storage.objects;

-- 2. Créer des policies permissives FRAÎCHES

-- POLICY UPLOAD - Permettre aux utilisateurs authentifiés d'uploader dans inspection-photos
CREATE POLICY "Allow authenticated users to upload inspection photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-photos'
);

-- POLICY SELECT - Permettre à tous de voir les photos
CREATE POLICY "Allow public to view inspection photos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'inspection-photos'
);

-- POLICY UPDATE - Permettre aux propriétaires de mettre à jour leurs photos
CREATE POLICY "Allow users to update their inspection photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inspection-photos' 
  AND auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'inspection-photos'
);

-- POLICY DELETE - Permettre aux propriétaires de supprimer leurs photos
CREATE POLICY "Allow users to delete their inspection photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-photos' 
  AND auth.uid() = owner
);

-- 3. Vérifier et mettre à jour le bucket
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
WHERE id = 'inspection-photos';

-- 4. Vérifier les policies créées
SELECT 
    '✅ Policy: ' || policyname as status,
    cmd as operation,
    CASE 
      WHEN roles::text LIKE '%authenticated%' THEN 'Authenticated users'
      WHEN roles::text LIKE '%public%' THEN 'Public'
      ELSE roles::text
    END as who_can_use
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%inspection%'
ORDER BY cmd, policyname;

-- 5. Vérifier la configuration du bucket
SELECT 
    '✅ Bucket: ' || id as status,
    CASE WHEN public THEN 'Public ✅' ELSE 'Private ❌' END as access,
    (file_size_limit / 1024 / 1024)::text || ' MB' as max_size,
    array_length(allowed_mime_types, 1)::text || ' types autorisés' as mime_types
FROM storage.buckets
WHERE id = 'inspection-photos';
