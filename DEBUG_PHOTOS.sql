-- Script de débogage pour vérifier les photos
-- Exécutez ce script dans le SQL Editor de Supabase

-- VÉRIFIER TOUTES LES TABLES EXISTANTES
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- VÉRIFIER LE NOM EXACT DES TABLES AVEC PHOTO OU INSPECTION
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%photo%' OR table_name LIKE '%inspection%')
ORDER BY table_name;

-- 1. Compter le total de photos (essayer les deux noms possibles)
SELECT COUNT(*) as total_photos FROM inspection_photos;
-- OU
-- SELECT COUNT(*) as total_photos FROM "inspections-photos";

-- 2. Voir toutes les photos avec leurs inspections
SELECT 
  ip.id,
  ip.inspection_id,
  ip.photo_type,
  ip.created_at,
  vi.mission_id,
  vi.inspection_type,
  vi.inspector_id
FROM inspection_photos ip
LEFT JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
ORDER BY ip.created_at DESC
LIMIT 20;

-- 3. Vérifier les inspections sans photos
SELECT 
  vi.id,
  vi.mission_id,
  vi.inspection_type,
  vi.inspector_id,
  vi.created_at,
  COUNT(ip.id) as photo_count
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.inspector_id, vi.created_at
ORDER BY vi.created_at DESC;

-- 4. Vérifier les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'inspection_photos';
