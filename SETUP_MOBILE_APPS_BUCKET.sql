-- ============================================
-- UPLOAD APK VERS SUPABASE STORAGE
-- ============================================

-- 1. Vérifier que le bucket mobile-apps existe
SELECT 
    id,
    name,
    public,
    file_size_limit,
    created_at
FROM storage.buckets
WHERE id = 'mobile-apps';

-- 2. Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'mobile-apps',
    'mobile-apps',
    true, -- Public pour permettre le téléchargement
    209715200, -- 200MB limit (pour les gros APK)
    ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 209715200,
    allowed_mime_types = ARRAY['application/vnd.android.package-archive', 'application/octet-stream'];

-- 3. Créer les policies pour permettre l'accès public
DROP POLICY IF EXISTS "Allow public to download mobile apps" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload mobile apps" ON storage.objects;

CREATE POLICY "Allow public to download mobile apps"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'mobile-apps'
);

CREATE POLICY "Allow authenticated users to upload mobile apps"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mobile-apps'
);

-- 4. Vérifier la configuration
SELECT 
    '✅ Bucket: ' || id as status,
    CASE WHEN public THEN 'Public ✅' ELSE 'Private ❌' END as access,
    (file_size_limit / 1024 / 1024)::text || ' MB' as max_size
FROM storage.buckets
WHERE id = 'mobile-apps';
