-- 🔍 VÉRIFICATION URGENTE - Assignations mahdi.convoyages@gmail.com

-- ========================================
-- TEST 1: Quel est le contact_id utilisé lors de l'assignation ?
-- ========================================

SELECT 
  '1️⃣ Tous les contacts mahdi.convoyages' as test,
  c.id as contact_id,
  c.email,
  c.user_id,
  p.email as user_email,
  c.created_at,
  CASE 
    WHEN c.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ BON user_id'
    ELSE '❌ Mauvais user_id'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY c.created_at DESC;

-- ========================================
-- TEST 2: TOUTES les assignations créées récemment
-- ========================================

SELECT 
  '2️⃣ Assignations créées dans les dernières 24h' as test,
  ma.id as assignation_id,
  m.reference as mission_ref,
  c.id as contact_id,
  c.name as contact_name,
  c.email as contact_email,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  ma.assigned_by,
  ma.assigned_at,
  CASE 
    WHEN ma.user_id = c.user_id THEN '✅ Cohérent'
    ELSE '❌ INCOHÉRENT'
  END as coherence,
  CASE 
    WHEN ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ Bon user_id'
    WHEN ma.user_id = '784dd826-62ae-4d94-81a0-618953d63010' THEN '❌ user_id = mahdi.benamor1994'
    WHEN ma.user_id = 'b5adbb76-c33f-45df-a236-649564f63af5' THEN '❌ user_id = convoiexpress95'
    ELSE '❌ Autre user_id incorrect'
  END as verif_user_id
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
WHERE ma.assigned_at > NOW() - INTERVAL '24 hours'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 3: Assignations pour contact mahdi.convoyages
-- ========================================

SELECT 
  '3️⃣ Assignations mahdi.convoyages (par email contact)' as test,
  ma.id,
  m.reference,
  c.id as contact_id,
  c.email as contact_email,
  ma.user_id as assignation_user_id,
  p.email as user_email_dans_assignation,
  ma.assigned_at,
  CASE 
    WHEN ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ BON user_id'
    ELSE '❌ MAUVAIS user_id'
  END as verif
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 4: Le user_id c37f15d6 voit quoi ?
-- ========================================

SELECT 
  '4️⃣ Ce que voit c37f15d6 (mahdi.convoyages)' as test,
  ma.id,
  m.reference,
  c.email as contact_email,
  ma.user_id,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
WHERE ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 5: Comparer avec l'autre compte
-- ========================================

SELECT 
  '5️⃣ Ce que voit 784dd826 (compte principal)' as test,
  ma.id,
  m.reference,
  c.email as contact_email,
  ma.user_id,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
WHERE ma.user_id = '784dd826-62ae-4d94-81a0-618953d63010'
ORDER BY ma.assigned_at DESC
LIMIT 5;
