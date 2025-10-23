-- ============================================
-- DIAGNOSTIC : Pourquoi 0 missions visibles ?
-- ============================================

-- 1️⃣ Combien de missions existent au TOTAL (sans RLS) ?
SELECT COUNT(*) as total_missions_in_db FROM missions;

-- 2️⃣ Mon user ID
SELECT auth.uid() as my_user_id;

-- 3️⃣ Répartition des missions par créateur
SELECT 
  user_id,
  COUNT(*) as missions_count
FROM missions
GROUP BY user_id
ORDER BY missions_count DESC;

-- 4️⃣ Missions avec assigned_to_user_id rempli ?
SELECT 
  COUNT(*) as total,
  COUNT(assigned_to_user_id) as with_assignee,
  COUNT(CASE WHEN assigned_to_user_id IS NOT NULL THEN 1 END) as assigned_count
FROM missions;

-- 5️⃣ Lister les 10 premières missions (avec leurs IDs users)
SELECT 
  id,
  reference,
  user_id as creator_id,
  assigned_to_user_id,
  status,
  pickup_address,
  created_at
FROM missions
ORDER BY created_at DESC
LIMIT 10;

-- 6️⃣ Vérifier si j'ai des assignments dans mission_assignments
SELECT 
  COUNT(*) as assignments_received
FROM mission_assignments
WHERE user_id = auth.uid();

-- 7️⃣ SOLUTION TEMPORAIRE : Si des missions existent mais pas de assigned_to_user_id
-- On peut assigner une mission de test à vous-même pour vérifier que ça marche

-- Décommenter les lignes ci-dessous pour créer une mission de test :
/*
INSERT INTO missions (
  reference,
  user_id,
  assigned_to_user_id,
  pickup_address,
  delivery_address,
  pickup_date,
  delivery_date,
  status,
  vehicle_brand,
  vehicle_model,
  vehicle_plate,
  price
) VALUES (
  'TEST-' || floor(random() * 10000)::text,
  auth.uid(),                    -- Créée par moi
  auth.uid(),                    -- Assignée à moi (pour test)
  '123 Rue de Test, Paris',
  '456 Avenue de Test, Lyon',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '2 days',
  'pending',
  'Tesla',
  'Model 3',
  'AA-123-BB',
  500.00
);
*/

-- 8️⃣ Vérifier que la mission de test est visible
-- (À exécuter APRÈS avoir créé la mission de test ci-dessus)
SELECT 
  'Missions de test visibles' as type,
  COUNT(*) as count
FROM missions
WHERE reference LIKE 'TEST-%'
  AND (user_id = auth.uid() OR assigned_to_user_id = auth.uid());
