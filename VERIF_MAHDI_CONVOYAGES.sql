-- 🔍 VÉRIFICATION ASSIGNATIONS POUR mahdi.convoyages@gmail.com

-- ========================================
-- TEST 1: Profil et contacts de mahdi.convoyages
-- ========================================

SELECT 
  '1️⃣ Profil mahdi.convoyages' as test,
  p.id as user_id,
  p.email,
  c.id as contact_id,
  c.name as contact_name,
  c.email as contact_email,
  c.user_id as contact_user_id,
  CASE 
    WHEN p.id = c.user_id THEN '✅ Lié correctement'
    ELSE '❌ PROBLÈME: contact.user_id ne correspond pas'
  END as statut_lien
FROM profiles p
LEFT JOIN contacts c ON c.email = 'mahdi.convoyages@gmail.com' OR c.user_id = p.id
WHERE p.email = 'mahdi.convoyages@gmail.com';

-- ========================================
-- TEST 2: TOUTES les assignations pour mahdi.convoyages
-- ========================================

-- Par email du contact
SELECT 
  '2️⃣ Assignations (par email contact)' as test,
  ma.id as assignation_id,
  m.reference as mission_ref,
  m.vehicle_brand,
  m.vehicle_model,
  c.name as contact_name,
  c.email as contact_email,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  ma.assigned_by,
  ma.status,
  ma.assigned_at,
  CASE 
    WHEN c.email = 'mahdi.convoyages@gmail.com' THEN '✅ Contact correct'
    ELSE '❌ Pas le bon contact'
  END as check_contact
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 3: Assignations par user_id (ce qui compte pour RLS)
-- ========================================

SELECT 
  '3️⃣ Assignations (par user_id)' as test,
  ma.id as assignation_id,
  m.reference as mission_ref,
  m.vehicle_brand,
  m.vehicle_model,
  c.name as contact_name,
  c.email as contact_email,
  ma.user_id as assignation_user_id,
  p.email as user_email,
  ma.assigned_by,
  ma.status,
  ma.assigned_at,
  CASE 
    WHEN ma.user_id = (SELECT id FROM profiles WHERE email = 'mahdi.convoyages@gmail.com') THEN '✅ user_id CORRECT'
    ELSE '❌ user_id INCORRECT'
  END as check_user_id
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
WHERE ma.user_id = (SELECT id FROM profiles WHERE email = 'mahdi.convoyages@gmail.com')
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 4: Vérifier si les assignations existent mais avec mauvais user_id
-- ========================================

SELECT 
  '4️⃣ Assignations avec contact mahdi.convoyages mais mauvais user_id' as test,
  ma.id as assignation_id,
  m.reference as mission_ref,
  c.name as contact_name,
  c.email as contact_email,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  p_correct.id as user_id_attendu,
  p_wrong.email as user_id_actuel_email,
  ma.assigned_at,
  CASE 
    WHEN ma.user_id = c.user_id THEN '✅ Cohérent'
    ELSE '❌ INCOHÉRENT: ma.user_id ≠ c.user_id'
  END as coherence
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p_correct ON p_correct.email = 'mahdi.convoyages@gmail.com'
LEFT JOIN profiles p_wrong ON p_wrong.id = ma.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 5: Comparer contact_id vs user_id
-- ========================================

SELECT 
  '5️⃣ Diagnostic complet' as test,
  ma.id,
  m.reference,
  c.name as contact_name,
  c.email as contact_email,
  c.id as contact_id,
  c.user_id as contact_user_id,
  ma.contact_id as assignation_contact_id,
  ma.user_id as assignation_user_id,
  CASE 
    WHEN ma.contact_id = c.id THEN '✅'
    ELSE '❌'
  END as contact_id_ok,
  CASE 
    WHEN ma.user_id = c.user_id THEN '✅'
    ELSE '❌ PROBLÈME ICI'
  END as user_id_ok,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 6: Rechercher le contact mahdi.convoyages
-- ========================================

SELECT 
  '6️⃣ Tous les contacts mahdi.convoyages' as test,
  c.id as contact_id,
  c.name,
  c.email,
  c.user_id,
  p.email as user_email,
  c.created_at
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email LIKE '%mahdi.convoyages%'
   OR c.name LIKE '%mahdi%'
ORDER BY c.created_at DESC;
