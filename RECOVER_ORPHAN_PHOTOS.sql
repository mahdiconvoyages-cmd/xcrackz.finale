-- ============================================
-- RÉCUPÉRER LES PHOTOS ORPHELINES
-- ============================================
-- Insère les photos du storage qui ne sont pas dans la base

INSERT INTO inspection_photos_v2 (
  id,
  inspection_id,
  photo_type,
  full_url,
  thumbnail_url,
  file_size_bytes,
  latitude,
  longitude,
  taken_at,
  created_at
)
SELECT 
  gen_random_uuid() as id,
  -- Extraire l'UUID de l'inspection depuis le nom du fichier
  (regexp_match(so.name, 'inspections/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::uuid as inspection_id,
  -- Extraire le type de photo (front, back, etc.)
  (regexp_match(so.name, '-([a-z_]+)-[0-9]+\.jpeg'))[1] as photo_type,
  -- URL publique complète
  'https://qmlbmjsgmnuygrvwfuux.supabase.co/storage/v1/object/public/inspection-photos/' || so.name as full_url,
  NULL as thumbnail_url,
  (so.metadata->>'size')::bigint as file_size_bytes,
  NULL as latitude,
  NULL as longitude,
  so.created_at as taken_at,
  so.created_at as created_at
FROM storage.objects so
WHERE so.bucket_id = 'inspection-photos'
AND so.created_at::date = CURRENT_DATE
-- Vérifier que cette photo n'existe pas déjà dans v2
AND NOT EXISTS (
  SELECT 1 
  FROM inspection_photos_v2 ip2 
  WHERE ip2.full_url LIKE '%' || so.name
);

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Compter les photos récupérées
SELECT 
  '✅ Photos récupérées aujourd''hui' as status,
  COUNT(*) as count
FROM inspection_photos_v2
WHERE created_at::date = CURRENT_DATE;

-- Vérifier par inspection
SELECT 
  vi.id as inspection_id,
  vi.inspection_type,
  COUNT(ip.id) as photo_count,
  array_agg(ip.photo_type) as photo_types
FROM vehicle_inspections vi
LEFT JOIN inspection_photos_v2 ip ON ip.inspection_id = vi.id
WHERE vi.created_at::date = CURRENT_DATE
GROUP BY vi.id
ORDER BY vi.created_at DESC;

-- Lister les photos récupérées
SELECT 
  inspection_id,
  photo_type,
  full_url,
  created_at
FROM inspection_photos_v2
WHERE created_at::date = CURRENT_DATE
ORDER BY inspection_id, photo_type;
