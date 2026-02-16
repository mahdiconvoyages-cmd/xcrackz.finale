-- 🔍 DIAGNOSTIC: Vérifier quels IDs d'inspection existent encore dans la DB
-- EXÉCUTER pour identifier les inspections valides

-- ===============================================
-- ÉTAPE 1: Vérifier quels IDs existent dans vehicle_inspections
-- ===============================================
SELECT 
  'IDs DANS VEHICLE_INSPECTIONS' as source,
  id as inspection_id,
  status,
  created_at
FROM vehicle_inspections 
ORDER BY created_at DESC;

-- ===============================================
-- ÉTAPE 2: Vérifier les IDs du Storage qui existent/n'existent pas
-- ===============================================
WITH storage_ids AS (
  SELECT UNNEST(ARRAY[
    '996a783c-9902-4c66-837a-dc68951d5051'::uuid,
    'ad077d9d-6931-4dc1-b248-28ec03bdbb85'::uuid, 
    'b49282af-b823-4b6f-82d0-34c6a771a058'::uuid,
    'b6fa89b8-97b2-4486-bcd1-dea33e7cf77c'::uuid
  ]) as storage_id
)
SELECT 
  si.storage_id,
  CASE 
    WHEN vi.id IS NOT NULL THEN '✅ EXISTE'
    ELSE '❌ SUPPRIMÉ'
  END as status_in_db,
  vi.status as inspection_status
FROM storage_ids si
LEFT JOIN vehicle_inspections vi ON vi.id = si.storage_id
ORDER BY status_in_db DESC;

-- ===============================================
-- ÉTAPE 3: Photos orphelines actuelles dans la DB
-- ===============================================
SELECT 
  'PHOTOS ORPHELINES ACTUELLES' as info,
  ip.inspection_id,
  COUNT(*) as photos_count
FROM inspection_photos ip
LEFT JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
WHERE vi.id IS NULL
GROUP BY ip.inspection_id;