-- ============================================
-- VÉRIFIER L'APK DANS SUPABASE STORAGE
-- ============================================

-- 1. Vérifier que le bucket mobile-apps existe
SELECT 
    id,
    name,
    public,
    file_size_limit / 1024 / 1024 as size_mb,
    created_at
FROM storage.buckets
WHERE id = 'mobile-apps';

-- 2. Lister TOUS les fichiers dans le bucket mobile-apps
SELECT 
    name,
    id,
    bucket_id,
    owner,
    created_at,
    updated_at,
    (metadata->>'size')::bigint / 1024 / 1024 as size_mb,
    metadata->>'mimetype' as mime_type
FROM storage.objects
WHERE bucket_id = 'mobile-apps'
ORDER BY created_at DESC;

-- 3. Chercher spécifiquement xcrackz
SELECT 
    'Fichier: ' || name as info,
    'Taille: ' || ((metadata->>'size')::bigint / 1024 / 1024)::text || ' MB' as size,
    'URL: https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/mobile-apps/' || name as download_url
FROM storage.objects
WHERE bucket_id = 'mobile-apps'
AND name LIKE '%xcrackz%'
ORDER BY created_at DESC;
