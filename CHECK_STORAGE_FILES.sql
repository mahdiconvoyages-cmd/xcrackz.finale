-- Vérifier TOUS les fichiers dans le bucket inspection-photos
SELECT 
  id,
  name,
  bucket_id,
  created_at,
  ROUND((metadata->>'size')::numeric / 1024, 2) as size_kb
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
ORDER BY created_at DESC
LIMIT 50;

-- Compter le total de fichiers
SELECT COUNT(*) as total_files
FROM storage.objects
WHERE bucket_id = 'inspection-photos';

-- Chercher spécifiquement l'inspection la plus récente
SELECT 
  id,
  name,
  created_at
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
AND (
  name LIKE '%afdcc884-300b-4671-be53-6ab066682357%'
  OR name LIKE '%9f0edc40-d46c-45dd-a3f5-16cf36805fc3%'
)
ORDER BY created_at DESC;
