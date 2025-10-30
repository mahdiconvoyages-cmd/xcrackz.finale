-- ============================================
-- SETUP BUCKETS STORAGE OPTIMISÉS
-- ============================================

-- 1. Bucket pour photos WebP avec thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'inspection-photos-webp',
    'inspection-photos-webp',
    true,
    52428800, -- 50MB par photo
    ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- 2. Bucket pour PDFs générés
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'inspection-pdfs',
    'inspection-pdfs',
    true,
    104857600, -- 100MB par PDF
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['application/pdf'];

-- ============================================
-- POLICIES POUR PHOTOS WEBP
-- ============================================

-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Allow public to view webp photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload webp photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their webp photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their webp photos" ON storage.objects;

-- Policy SELECT (public)
CREATE POLICY "Allow public to view webp photos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'inspection-photos-webp'
);

-- Policy INSERT (authenticated)
CREATE POLICY "Allow authenticated users to upload webp photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-photos-webp'
);

-- Policy UPDATE (owner)
CREATE POLICY "Allow users to update their webp photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inspection-photos-webp' 
  AND auth.uid() = owner
);

-- Policy DELETE (owner)
CREATE POLICY "Allow users to delete their webp photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-photos-webp' 
  AND auth.uid() = owner
);

-- ============================================
-- POLICIES POUR PDFs
-- ============================================

DROP POLICY IF EXISTS "Allow public to download PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow service to upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow service to update PDFs" ON storage.objects;

-- Policy SELECT (public)
CREATE POLICY "Allow public to download PDFs"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'inspection-pdfs'
);

-- Policy INSERT (service role & authenticated)
CREATE POLICY "Allow service to upload PDFs"
ON storage.objects
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  bucket_id = 'inspection-pdfs'
);

-- Policy UPDATE (service role)
CREATE POLICY "Allow service to update PDFs"
ON storage.objects
FOR UPDATE
TO service_role
USING (
  bucket_id = 'inspection-pdfs'
);

-- ============================================
-- VÉRIFICATION
-- ============================================

SELECT 
    '✅ Bucket: ' || id as status,
    CASE WHEN public THEN 'Public ✅' ELSE 'Private ❌' END as access,
    (file_size_limit / 1024 / 1024)::text || ' MB' as max_size,
    array_length(allowed_mime_types, 1) as mime_types_count
FROM storage.buckets
WHERE id IN ('inspection-photos-webp', 'inspection-pdfs')
ORDER BY id;

-- Vérifier les policies
SELECT 
    '✅ Policy: ' || policyname as status,
    cmd as operation,
    CASE 
      WHEN roles::text LIKE '%authenticated%' THEN 'Authenticated'
      WHEN roles::text LIKE '%public%' THEN 'Public'
      WHEN roles::text LIKE '%service_role%' THEN 'Service'
      ELSE roles::text
    END as who_can_use
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND (policyname LIKE '%webp%' OR policyname LIKE '%PDF%')
ORDER BY cmd, policyname;
