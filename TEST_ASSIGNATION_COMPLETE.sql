-- 🔍 TEST COMPLET: Pourquoi la mission assignée n'apparaît pas ?

-- ========================================
-- ÉTAPE 1: Vérifier l'assignation récente
-- ========================================

-- Dernières assignations créées
SELECT 
  '1️⃣ Dernières assignations' as etape,
  ma.id,
  ma.created_at,
  m.reference as mission,
  c.name as contact_assigne,
  c.email as contact_email,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  ma.assigned_by,
  ma.status,
  CASE 
    WHEN c.user_id IS NOT NULL THEN '✅ Contact peut se connecter'
    ELSE '❌ Contact ne peut PAS se connecter'
  END as peut_voir
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
ORDER BY ma.created_at DESC
LIMIT 5;

-- ========================================
-- ÉTAPE 2: Vérifier SI le contact assigné peut se connecter
-- ========================================

-- Prenez le contact_email de l'étape 1
SELECT 
  '2️⃣ Contact assigné' as etape,
  c.id as contact_id,
  c.name,
  c.email,
  c.user_id,
  p.email as user_email,
  CASE 
    WHEN c.user_id IS NULL THEN '❌ PROBLÈME: Contact n''a pas de user_id'
    WHEN p.email IS NULL THEN '❌ PROBLÈME: user_id ne correspond à aucun utilisateur'
    WHEN c.email != p.email THEN '⚠️ ATTENTION: Email contact ≠ Email utilisateur'
    ELSE '✅ OK: Contact correctement lié'
  END as diagnostic
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'EMAIL_DU_CONTACT_ASSIGNE'  -- ⚠️ REMPLACEZ par l'email de l'étape 1
OR c.id IN (
  SELECT contact_id FROM mission_assignments 
  ORDER BY created_at DESC LIMIT 1
);

-- ========================================
-- ÉTAPE 3: Test avec l'utilisateur qui DEVRAIT voir la mission
-- ========================================

-- Remplacez par l'email de l'utilisateur qui devrait voir la mission
SELECT 
  '3️⃣ Que voit cet utilisateur ?' as etape,
  p.email as utilisateur,
  c.id as contact_id,
  c.name as contact_name,
  ma.id as assignation_id,
  m.reference as mission_ref,
  ma.created_at as date_assignation
FROM profiles p
LEFT JOIN contacts c ON c.user_id = p.id
LEFT JOIN mission_assignments ma ON ma.contact_id = c.id
LEFT JOIN missions m ON m.id = ma.mission_id
WHERE p.email = 'convoiexpress95@gmail.com'  -- ⚠️ Email de celui qui devrait voir la mission
ORDER BY ma.created_at DESC;

-- ========================================
-- ÉTAPE 4: DIAGNOSTIC - Correspondance user_id
-- ========================================

-- Vérifier que user_id dans mission_assignments = user_id dans contacts
SELECT 
  '4️⃣ Correspondance user_id' as etape,
  ma.id as assignation_id,
  m.reference,
  c.name as contact,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  CASE 
    WHEN c.user_id = ma.user_id THEN '✅ user_id correspondent'
    ELSE '❌ PROBLÈME: user_id ne correspondent PAS'
  END as correspondance
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
ORDER BY ma.created_at DESC
LIMIT 5;

-- ========================================
-- ÉTAPE 5: SOLUTION - Corriger l'assignation
-- ========================================

-- Si le problème est que ma.user_id ≠ c.user_id, corrigez :
/*
UPDATE mission_assignments ma
SET user_id = (
  SELECT c.user_id 
  FROM contacts c 
  WHERE c.id = ma.contact_id
)
WHERE ma.id = 'ID_ASSIGNATION_PROBLEMATIQUE';
*/

-- Ou pour TOUTES les assignations :
/*
UPDATE mission_assignments ma
SET user_id = (
  SELECT c.user_id 
  FROM contacts c 
  WHERE c.id = ma.contact_id
);
*/

-- ========================================
-- ÉTAPE 6: Vérifier RLS Policies
-- ========================================

SELECT 
  '6️⃣ Policies mission_assignments' as etape,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'mission_assignments';
