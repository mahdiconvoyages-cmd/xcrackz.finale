-- ============================================
-- DEBUG: Vérifier pourquoi les missions assignées n'apparaissent pas
-- ============================================

-- 1. Voir TOUTES les missions avec leurs assignations
SELECT 
  m.id,
  m.reference,
  m.vehicle_brand,
  m.status,
  u1.email as created_by,
  m.user_id as creator_uuid,
  u2.email as assigned_to,
  m.assigned_to_user_id as assigned_uuid
FROM missions m
LEFT JOIN auth.users u1 ON m.user_id = u1.id
LEFT JOIN auth.users u2 ON m.assigned_to_user_id = u2.id
ORDER BY m.created_at DESC
LIMIT 10;

-- ============================================
-- 2. Vérifier spécifiquement la mission TEST
-- ============================================

SELECT 
  id,
  reference,
  user_id,
  assigned_to_user_id,
  vehicle_brand,
  status
FROM missions
WHERE reference = 'TEST-ASSIGNMENT-001';

-- ============================================
-- 3. Test: Ce que User 2 (convoiexpress95) devrait voir
-- ============================================

-- User 2 UUID: b5adbb76-c33f-45df-a236-649564f63af5

-- Missions CRÉÉES par User 2
SELECT 
  'Créées par moi' as type,
  id,
  reference,
  vehicle_brand,
  user_id,
  assigned_to_user_id
FROM missions
WHERE user_id = 'b5adbb76-c33f-45df-a236-649564f63af5'
ORDER BY created_at DESC;

-- Missions ASSIGNÉES à User 2
SELECT 
  'Assignées à moi' as type,
  id,
  reference,
  vehicle_brand,
  user_id,
  assigned_to_user_id
FROM missions
WHERE assigned_to_user_id = 'b5adbb76-c33f-45df-a236-649564f63af5'
ORDER BY created_at DESC;

-- ============================================
-- 4. Vérifier les RLS policies actives
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY policyname;

-- ============================================
-- 5. Test avec auth.uid() (si connecté en tant que User 2)
-- ============================================

-- IMPORTANT: Se connecter en tant que convoiexpress95@gmail.com dans Supabase
-- Puis exécuter:

/*
SELECT 
  id,
  reference,
  vehicle_brand,
  user_id,
  assigned_to_user_id,
  CASE 
    WHEN user_id = auth.uid() THEN 'Je suis créateur'
    WHEN assigned_to_user_id = auth.uid() THEN 'Je suis assigné'
    ELSE 'Autre'
  END as mon_role
FROM missions
WHERE user_id = auth.uid() OR assigned_to_user_id = auth.uid()
ORDER BY created_at DESC;
*/
