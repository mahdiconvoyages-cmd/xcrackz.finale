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

-- 2. Mettre à jour le bucket pour augmenter les limites
UPDATE storage.buckets
SET 
    public = true,
    file_size_limit = 524288000, -- 500MB limit (pour les gros APK)
    allowed_mime_types = NULL -- Autoriser tous les types de fichiers
WHERE id = 'mobile-apps';

-- Si le bucket n'existe pas, le créer
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'mobile-apps',
    'mobile-apps',
    true,
    524288000, -- 500MB
    NULL -- Tous types autorisés
)
ON CONFLICT (id) DO NOTHING;

-- 3. Supprimer et recréer les policies pour permettre l'accès complet
DROP POLICY IF EXISTS "Allow public to download mobile apps" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload mobile apps" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update mobile apps" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete mobile apps" ON storage.objects;

-- Policy pour téléchargement public
CREATE POLICY "Allow public to download mobile apps"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'mobile-apps'
);

-- Policy pour upload (authenticated users)
CREATE POLICY "Allow authenticated users to upload mobile apps"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mobile-apps'
);

-- Policy pour update
CREATE POLICY "Allow users to update mobile apps"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mobile-apps'
);

-- Policy pour delete
CREATE POLICY "Allow users to delete mobile apps"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mobile-apps'
);

-- 4. Vérifier la configuration
SELECT 
    '✅ Bucket: ' || id as status,
    CASE WHEN public THEN 'Public ✅' ELSE 'Private ❌' END as access,
    (file_size_limit / 1024 / 1024)::text || ' MB' as max_size
FROM storage.buckets
WHERE id = 'mobile-apps';
