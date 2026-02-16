-- ============================================
-- TEST ASSIGNMENT AVEC VOS VRAIS USERS
-- ============================================

-- VOS USERS:
-- User 1: mahdi.convoyages@gmail.com   → c37f15d6-545a-4792-9697-de03991b4f17
-- User 2: convoiexpress95@gmail.com    → b5adbb76-c33f-45df-a236-649564f63af5
-- User 3: mahdi.benamor1994@gmail.com  → 784dd826-62ae-4d94-81a0-618953d63010

-- ============================================
-- TEST 1: Créer mission avec User 1 (mahdi.convoyages)
-- ============================================

-- Assurez-vous d'être connecté en tant que mahdi.convoyages@gmail.com
-- Puis exécutez:

INSERT INTO missions (
  user_id,
  reference,
  vehicle_brand,
  vehicle_model,
  pickup_address,
  delivery_address,
  status,
  created_at
) VALUES (
  'c37f15d6-545a-4792-9697-de03991b4f17',  -- User 1 (mahdi.convoyages)
  'TEST-ASSIGNMENT-001',
  'Toyota',
  'Corolla',
  '10 Rue de Paris, 75001 Paris, France',
  '20 Avenue de Lyon, 69001 Lyon, France',
  'pending',
  NOW()
) RETURNING id, reference, user_id;

-- ============================================
-- TEST 2: Assigner la mission à User 2 (convoiexpress95)
-- ============================================

UPDATE missions
SET assigned_to_user_id = 'b5adbb76-c33f-45df-a236-649564f63af5'  -- User 2 (convoiexpress95)
WHERE reference = 'TEST-ASSIGNMENT-001'
RETURNING 
  id,
  reference,
  user_id as creator_uuid,
  assigned_to_user_id as assigned_to_uuid;

-- ============================================
-- TEST 3: Vérifier que User 1 voit la mission (créée)
-- ============================================

-- Se connecter en tant que mahdi.convoyages@gmail.com
SELECT 
  id,
  reference,
  user_id,
  assigned_to_user_id,
  vehicle_brand,
  status,
  'Je suis le créateur' as role
FROM missions
WHERE user_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
  AND reference = 'TEST-ASSIGNMENT-001';
-- ✅ Devrait retourner 1 ligne

-- ============================================
-- TEST 4: Vérifier que User 2 voit la mission (assignée)
-- ============================================

-- Se connecter en tant que convoiexpress95@gmail.com
SELECT 
  id,
  reference,
  user_id,
  assigned_to_user_id,
  vehicle_brand,
  status,
  'Je suis assigné' as role
FROM missions
WHERE assigned_to_user_id = 'b5adbb76-c33f-45df-a236-649564f63af5'
  AND reference = 'TEST-ASSIGNMENT-001';
-- ✅ Devrait retourner 1 ligne

-- ============================================
-- TEST 5: Vérifier que User 3 NE voit PAS la mission
-- ============================================

-- Se connecter en tant que mahdi.benamor1994@gmail.com
SELECT 
  id,
  reference,
  user_id,
  assigned_to_user_id,
  vehicle_brand,
  status
FROM missions
WHERE (user_id = '784dd826-62ae-4d94-81a0-618953d63010' 
   OR assigned_to_user_id = '784dd826-62ae-4d94-81a0-618953d63010')
  AND reference = 'TEST-ASSIGNMENT-001';
-- ❌ Devrait retourner 0 ligne (vide)

-- ============================================
-- TEST 6: Vue globale de la mission TEST
-- ============================================

SELECT 
  m.id,
  m.reference,
  u1.email as created_by_email,
  u2.email as assigned_to_email,
  m.vehicle_brand,
  m.status,
  m.created_at
FROM missions m
LEFT JOIN auth.users u1 ON m.user_id = u1.id
LEFT JOIN auth.users u2 ON m.assigned_to_user_id = u2.id
WHERE m.reference = 'TEST-ASSIGNMENT-001';

-- ============================================
-- NETTOYAGE (après test)
-- ============================================

-- DELETE FROM missions WHERE reference = 'TEST-ASSIGNMENT-001';
