-- 🔍 DIAGNOSTIC SIMPLIFIÉ - Exécuter requête par requête
-- Copiez et exécutez UNE requête à la fois

-- REQUÊTE 1: Inspections et inspector_id
SELECT 
  id as inspection_id,
  mission_id,
  inspection_type,
  inspector_id,
  status,
  created_at
FROM vehicle_inspections
ORDER BY created_at DESC;

-- REQUÊTE 2: Photos par inspection
SELECT 
  vi.id as inspection_id,
  vi.inspection_type,
  vi.inspector_id,
  COUNT(ip.id) as photo_count
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
GROUP BY vi.id, vi.inspection_type, vi.inspector_id
ORDER BY vi.created_at DESC;

-- REQUÊTE 3: Photos de l'inspection récupérée
SELECT 
  ip.inspection_id,
  ip.photo_type,
  ip.photo_url,
  vi.inspector_id
FROM inspection_photos ip
LEFT JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
WHERE ip.inspection_id = '996a783c-9902-4c66-837a-dc68951d5051';

-- REQUÊTE 4: Utilisateurs (essayez auth.users si profiles ne marche pas)
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;