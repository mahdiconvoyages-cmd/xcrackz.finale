-- ============================================
-- TEST ASSIGNMENT MISSIONS
-- ============================================

-- ÉTAPE 1: Trouver les vrais UUIDs des users
-- ============================================

-- Voir tous les users avec leur email
SELECT 
  id as user_uuid,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- ÉTAPE 2: Créer une mission de test (User A)
-- ============================================

-- Remplacer les valeurs ci-dessous:
/*
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
  auth.uid(),  -- User A (celui connecté)
  'TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT,  -- Référence unique
  'Toyota',
  'Corolla',
  '10 Rue de Paris, 75001 Paris',
  '20 Avenue de Lyon, 69001 Lyon',
  'pending',
  NOW()
) RETURNING id, reference, user_id;
*/

-- ============================================
-- ÉTAPE 3: Voir les missions du user connecté
-- ============================================

SELECT 
  id,
  reference,
  user_id as creator_uuid,
  assigned_to_user_id,
  vehicle_brand,
  status,
  created_at
FROM missions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- ÉTAPE 4: Assigner une mission à un autre user
-- ============================================

-- IMPORTANT: Remplacer les UUIDs par les vrais IDs!
/*
UPDATE missions
SET assigned_to_user_id = 'COLLER-ICI-UUID-USER-B'
WHERE reference = 'TEST-XXX'  -- Référence de la mission créée
RETURNING id, reference, user_id, assigned_to_user_id;
*/

-- ============================================
-- ÉTAPE 5: Vérifier que User B voit la mission
-- ============================================

-- Se connecter en tant que User B, puis:
/*
SELECT 
  id,
  reference,
  user_id as created_by,
  assigned_to_user_id,
  vehicle_brand,
  status
FROM missions
WHERE assigned_to_user_id = auth.uid()
ORDER BY created_at DESC;
*/

-- ============================================
-- AIDE: Query pour copier-coller les UUIDs
-- ============================================

-- Liste des users avec format copier-coller facile:
SELECT 
  'User: ' || email || ' → UUID: ' || id as info
FROM auth.users
ORDER BY created_at DESC;
