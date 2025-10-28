-- ============================================
-- DIAGNOSTIC ET FIX: Bucket vehicle-images
-- ============================================

-- 1. Vérifier si le bucket existe
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'vehicle-images';

-- 2. Si le bucket n'existe pas, le créer
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-images',
  'vehicle-images',
  true,  -- Public pour que les images soient accessibles
  5242880,  -- 5 MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Créer les policies pour le bucket
-- Policy 1: Tout le monde peut voir les images (bucket public)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-images');

-- Policy 2: Utilisateurs authentifiés peuvent uploader
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-images');

-- Policy 3: Utilisateurs peuvent supprimer leurs propres images
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Utilisateurs peuvent mettre à jour leurs propres images
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicle-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Vérifier les policies créées
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%vehicle%' OR policyname LIKE '%Public Access%';
