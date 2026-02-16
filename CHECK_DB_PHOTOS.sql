-- Vérifier les photos dans inspection_photos_v2 pour ces inspections
SELECT 
  id,
  inspection_id,
  photo_type,
  created_at
FROM inspection_photos_v2
WHERE inspection_id IN (
  'afdcc884-300b-4671-be53-6ab066682357',
  '9f0edc40-d46c-45dd-a3f5-16cf36805fc3'
)
ORDER BY created_at DESC;

-- Vérifier TOUTES les photos dans inspection_photos_v2
SELECT COUNT(*) as total_rows
FROM inspection_photos_v2;

-- Les 10 dernières photos insérées
SELECT 
  id,
  inspection_id,
  photo_type,
  created_at
FROM inspection_photos_v2
ORDER BY created_at DESC
LIMIT 10;
