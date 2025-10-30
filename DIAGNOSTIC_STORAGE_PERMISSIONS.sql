-- ============================================
-- DIAGNOSTIC STORAGE PERMISSIONS
-- ============================================

-- 1. Vérifier l'existence du bucket
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id = 'inspection-photos';

-- 2. Lister toutes les policies sur storage.objects
SELECT 
    policyname,
    permissive,
    roles,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'Avec condition USING'
        ELSE 'Sans condition'
    END as has_using,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Avec condition WITH CHECK'
        ELSE 'Sans condition'
    END as has_with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY cmd, policyname;

-- 3. Vérifier les permissions de l'utilisateur actuel
SELECT 
    'Current user: ' || current_user as info
UNION ALL
SELECT 
    'Auth UID: ' || COALESCE(auth.uid()::text, 'NOT AUTHENTICATED') as info;

-- 4. Compter les objets dans le bucket
SELECT 
    COUNT(*) as total_photos,
    COUNT(DISTINCT owner) as unique_owners
FROM storage.objects
WHERE bucket_id = 'inspection-photos';

-- 5. Afficher les dernières erreurs si disponibles
SELECT 
    'Bucket exists: ' || 
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'inspection-photos') 
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END as status
UNION ALL
SELECT 
    'Bucket is public: ' || 
    CASE 
        WHEN (SELECT public FROM storage.buckets WHERE id = 'inspection-photos') 
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END as status
UNION ALL
SELECT 
    'Upload policy exists: ' || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' 
            AND schemaname = 'storage'
            AND cmd = 'INSERT'
            AND policyname LIKE '%inspection%'
        ) 
        THEN '✅ YES' 
        ELSE '❌ NO - RUN FIX_STORAGE_RLS_POLICIES.sql' 
    END as status;
