-- ============================================
-- CRÉER MISSIONS DE TEST AVEC VRAIS UUIDs
-- ============================================

-- Mission 1 : Pour stephanebeuriot@aol.com (créée ET assignée à lui-même)
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
  'TEST-RLS-001',
  'd19af661-8b59-4ccc-aa36-c693c1122950',
  'd19af661-8b59-4ccc-aa36-c693c1122950',
  '123 Rue de Test, Paris 75001',
  '456 Avenue de Test, Lyon 69001',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '2 days',
  'pending',
  'Tesla',
  'Model 3',
  'TEST-001',
  'https://images.unsplash.com/photo-1560958089-b8a1929cea89',
  500.00,
  'Mission de test RLS - stephanebeuriot@aol.com'
);

-- Mission 2 : Pour a2cpartenaire@aol.com
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
  'TEST-RLS-002',
  '7fa41d0a-2f20-4713-ac4c-7d4faf0b5d0d',
  '7fa41d0a-2f20-4713-ac4c-7d4faf0b5d0d',
  '789 Boulevard Test, Marseille 13001',
  '321 Allée Test, Toulouse 31000',
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '3 days',
  'pending',
  'BMW',
  'X5',
  'TEST-002',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e',
  750.00,
  'Mission de test RLS - a2cpartenaire@aol.com'
);

-- Mission 3 : Créée par mahdi199409@gmail.com, assignée à mahdidepariis@gmail.com
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
  'TEST-RLS-003',
  '427508b8-95a6-4801-9238-04150e185d22',  -- mahdi199409 (créateur)
  'c88cea89-48de-4c92-b55f-d6a2653ecff7',  -- mahdidepariis (assigné)
  '555 Rue Assignment, Lille 59000',
  '666 Avenue Test, Bordeaux 33000',
  NOW() + INTERVAL '3 days',
  NOW() + INTERVAL '4 days',
  'pending',
  'Mercedes',
  'Sprinter',
  'TEST-003',
  'https://images.unsplash.com/photo-1527786356703-4b100091cd2c',
  1200.00,
  'Mission assignée - Test RLS cross-user'
);

-- Vérifier les missions créées
SELECT 
  reference,
  user_id,
  assigned_to_user_id,
  vehicle_brand,
  vehicle_model,
  status,
  notes
FROM missions
WHERE reference LIKE 'TEST-RLS-%'
ORDER BY reference;

-- Vérifier qui peut voir quelle mission (depuis console web)
-- Mission TEST-RLS-001 : visible par stephanebeuriot@aol.com (créateur ET assigné)
-- Mission TEST-RLS-002 : visible par a2cpartenaire@aol.com (créateur ET assigné)
-- Mission TEST-RLS-003 : 
--   - visible par mahdi199409@gmail.com (créateur, dans "Missions Créées")
--   - visible par mahdidepariis@gmail.com (assigné, dans "Missions Reçues")
