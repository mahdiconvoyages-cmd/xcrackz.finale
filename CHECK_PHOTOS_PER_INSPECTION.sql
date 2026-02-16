-- 🔍 VÉRIFIER QUELLES INSPECTIONS ONT DES PHOTOS
-- EXÉCUTER dans Supabase SQL Editor

SELECT 
  vi.id as inspection_id,
  vi.inspection_type,
  vi.status,
  vi.created_at,
  COUNT(ip.id) as photo_count,
  STRING_AGG(ip.photo_type, ', ') as photo_types
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
GROUP BY vi.id, vi.inspection_type, vi.status, vi.created_at
ORDER BY vi.created_at DESC;