-- ============================================
-- CRÉER MISSION DE TEST (Admin SQL - Bypass RLS)
-- ============================================

-- 1️⃣ D'abord, lister les users existants pour obtenir un vrai UUID
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2️⃣ Copier un UUID d'utilisateur ci-dessus, puis exécuter :
-- REMPLACER 'VOTRE_USER_ID' par un UUID réel de la requête ci-dessus

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
  vehicle_image_url,
  price,
  notes
) VALUES (
  'TEST-RLS-' || floor(random() * 10000)::text,
  'VOTRE_USER_ID',                    -- REMPLACER par UUID réel
  'VOTRE_USER_ID',                    -- REMPLACER (même ID pour test)
  '123 Rue de Test, Paris 75001',
  '456 Avenue de Test, Lyon 69001',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '2 days',
  'pending',
  'Tesla',
  'Model 3',
  'AA-TEST-01',
  'https://images.unsplash.com/photo-1560958089-b8a1929cea89',
  500.00,
  'Mission de test pour vérifier RLS'
);

-- 3️⃣ Vérifier que la mission a été créée
SELECT 
  reference,
  user_id,
  assigned_to_user_id,
  pickup_address,
  status
FROM missions
WHERE reference LIKE 'TEST-RLS-%'
ORDER BY created_at DESC
LIMIT 1;

-- 4️⃣ Maintenant, connectez-vous à la console WEB avec ce user
--    et vérifiez que la mission apparaît dans "Missions Créées"
--    ET dans "Missions Reçues" (car assigned_to_user_id = user_id)
