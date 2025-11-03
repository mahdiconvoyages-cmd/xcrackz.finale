-- ============================================
-- DIAGNOSTIC COMPLET - PHOTOS D'INSPECTION
-- ============================================
-- Exécuter dans Supabase SQL Editor pour diagnostiquer les problèmes d'affichage photos

-- 1. VÉRIFIER LE BUCKET INSPECTION-PHOTOS
SELECT 
  '📦 BUCKET INSPECTION-PHOTOS' as section,
  id as bucket_name,
  public as is_public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'inspection-photos';

-- 2. COMPTER LES PHOTOS PAR TYPE D'INSPECTION
SELECT 
  '📊 PHOTOS PAR TYPE' as section,
  vi.inspection_type,
  COUNT(ip.id) as photo_count,
  COUNT(DISTINCT ip.inspection_id) as inspections_with_photos
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE vi.created_at > NOW() - INTERVAL '30 days'
GROUP BY vi.inspection_type
ORDER BY vi.inspection_type;

-- 3. VÉRIFIER LE FORMAT DES URLs (dernières 20 photos)
SELECT 
  '🔗 FORMAT DES URLs' as section,
  ip.id,
  ip.photo_type,
  ip.photo_url,
  CASE 
    WHEN ip.photo_url LIKE 'https://%' THEN '✅ URL complète'
    WHEN ip.photo_url LIKE 'http://%' THEN '✅ URL complète (http)'
    WHEN ip.photo_url LIKE 'inspections/%' THEN '⚠️ Path relatif (needs conversion)'
    WHEN ip.photo_url IS NULL THEN '❌ NULL'
    ELSE '❓ Format inconnu'
  END as url_status,
  LENGTH(ip.photo_url) as url_length,
  vi.inspection_type,
  ip.created_at
FROM inspection_photos ip
INNER JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
ORDER BY ip.created_at DESC
LIMIT 20;

-- 4. COMPTER LES PHOTOS PAR FORMAT D'URL
SELECT 
  '📈 DISTRIBUTION FORMAT URLs' as section,
  CASE 
    WHEN photo_url LIKE 'https://%' THEN 'URL complète HTTPS'
    WHEN photo_url LIKE 'http://%' THEN 'URL complète HTTP'
    WHEN photo_url LIKE 'inspections/%' THEN 'Path relatif'
    WHEN photo_url IS NULL THEN 'NULL'
    ELSE 'Autre format'
  END as format_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM inspection_photos
GROUP BY format_type
ORDER BY count DESC;

-- 5. PHOTOS DANS STORAGE VS BASE DE DONNÉES
SELECT 
  '💾 STORAGE VS DATABASE' as section,
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'inspection-photos') as photos_in_storage,
  (SELECT COUNT(*) FROM inspection_photos) as photos_in_database,
  (SELECT COUNT(*) FROM inspection_photos WHERE photo_url IS NOT NULL) as photos_with_url;

-- 6. DERNIÈRES INSPECTIONS AVEC LEURS PHOTOS
SELECT 
  '🔍 DERNIÈRES INSPECTIONS' as section,
  vi.id as inspection_id,
  vi.inspection_type,
  m.reference as mission_ref,
  COUNT(ip.id) as photo_count,
  STRING_AGG(ip.photo_type, ', ') as photo_types,
  STRING_AGG(
    CASE 
      WHEN ip.photo_url LIKE 'http%' THEN '✅'
      WHEN ip.photo_url LIKE 'inspections/%' THEN '⚠️'
      ELSE '❌'
    END, 
    ', '
  ) as url_status,
  vi.created_at
FROM vehicle_inspections vi
LEFT JOIN missions m ON m.id = vi.mission_id
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE vi.created_at > NOW() - INTERVAL '7 days'
GROUP BY vi.id, vi.inspection_type, m.reference, vi.created_at
ORDER BY vi.created_at DESC
LIMIT 10;

-- 7. VÉRIFIER LES POLICIES RLS SUR STORAGE
SELECT 
  '🔒 RLS POLICIES - STORAGE' as section,
  policyname as policy_name,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%inspection%'
ORDER BY policyname;

-- 8. PHOTOS ORPHELINES (dans storage mais pas en DB)
SELECT 
  '🔎 PHOTOS ORPHELINES' as section,
  so.name as storage_path,
  so.created_at,
  so.metadata->>'size' as file_size,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM inspection_photos ip 
      WHERE ip.photo_url LIKE '%' || so.name || '%'
    ) THEN '✅ Référencée en DB'
    ELSE '⚠️ Orpheline (pas en DB)'
  END as status
FROM storage.objects so
WHERE so.bucket_id = 'inspection-photos'
  AND so.created_at > NOW() - INTERVAL '7 days'
ORDER BY so.created_at DESC
LIMIT 15;

-- 9. INSPECTIONS SANS PHOTOS
SELECT 
  '⚠️ INSPECTIONS SANS PHOTOS' as section,
  vi.id,
  vi.inspection_type,
  m.reference as mission_ref,
  vi.created_at,
  EXTRACT(EPOCH FROM (NOW() - vi.created_at))/3600 as hours_ago
FROM vehicle_inspections vi
LEFT JOIN missions m ON m.id = vi.mission_id
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE vi.created_at > NOW() - INTERVAL '7 days'
  AND ip.id IS NULL
ORDER BY vi.created_at DESC
LIMIT 10;

-- 10. EXEMPLE DE CONVERSION PATH → PUBLIC URL
SELECT 
  '🔧 EXEMPLE CONVERSION URL' as section,
  ip.photo_url as original_path,
  CASE 
    WHEN ip.photo_url LIKE 'http%' THEN ip.photo_url
    ELSE 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/' || ip.photo_url
  END as public_url_example
FROM inspection_photos ip
WHERE ip.photo_url IS NOT NULL
LIMIT 5;

-- 11. RÉSUMÉ GLOBAL
SELECT 
  '📋 RÉSUMÉ GLOBAL' as section,
  (SELECT COUNT(*) FROM vehicle_inspections WHERE created_at > NOW() - INTERVAL '30 days') as total_inspections_30d,
  (SELECT COUNT(*) FROM inspection_photos WHERE created_at > NOW() - INTERVAL '30 days') as total_photos_30d,
  (SELECT COUNT(*) FROM inspection_photos WHERE photo_url LIKE 'http%') as photos_with_full_url,
  (SELECT COUNT(*) FROM inspection_photos WHERE photo_url LIKE 'inspections/%') as photos_with_path_only,
  (SELECT COUNT(*) FROM inspection_photos WHERE photo_url IS NULL) as photos_without_url,
  (SELECT public FROM storage.buckets WHERE id = 'inspection-photos') as bucket_is_public;
