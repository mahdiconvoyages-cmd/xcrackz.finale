-- ============================================
-- RÉCUPÉRER LES PHOTOS ORPHELINES DU STORAGE
-- ============================================

-- 1. Lister les fichiers uploadés aujourd'hui
SELECT 
  id,
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
AND created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- 2. Extraire inspection_id depuis les noms de fichiers
SELECT 
  id as storage_id,
  name as file_path,
  -- Extraire l'UUID de l'inspection depuis le path
  regexp_match(name, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') as inspection_id_match,
  created_at
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
AND created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- 3. Créer les URLs publiques pour ces fichiers
SELECT 
  name,
  'https://qmlbmjsgmnuygrvwfuux.supabase.co/storage/v1/object/public/inspection-photos/' || name as public_url,
  created_at
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
AND created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
