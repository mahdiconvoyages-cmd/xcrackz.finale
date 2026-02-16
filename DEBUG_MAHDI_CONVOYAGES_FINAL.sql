-- 🔍 VÉRIFICATION EXACTE - Que voit mahdi.convoyages ?

-- ========================================
-- TEST 1: Missions avec le BON user_id
-- ========================================

SELECT 
  '1️⃣ Missions visibles pour c37f15d6' as test,
  ma.id as assignation_id,
  m.id as mission_id,
  m.reference,
  m.vehicle_brand,
  m.vehicle_model,
  c.email as contact_email,
  ma.user_id,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
WHERE ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 2: Contacts pour mahdi.convoyages
-- ========================================

SELECT 
  '2️⃣ Contacts mahdi.convoyages' as test,
  id as contact_id,
  email,
  user_id,
  name
FROM contacts
WHERE user_id = 'c37f15d6-545a-4792-9697-de03991b4f17';

-- ========================================
-- TEST 3: Assignations par contact_id
-- ========================================

SELECT 
  '3️⃣ Assignations via contact_id' as test,
  ma.id,
  m.reference,
  c.id as contact_id,
  c.email as contact_email,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  CASE 
    WHEN ma.user_id = c.user_id THEN '✅ Cohérent'
    ELSE '❌ INCOHÉRENT'
  END as coherence
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
WHERE c.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 4: TOUTES les assignations existantes
-- ========================================

SELECT 
  '4️⃣ TOUTES les assignations' as test,
  ma.id,
  m.reference,
  c.email as contact_email,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  p.email as assignation_user_email,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
ORDER BY ma.assigned_at DESC
LIMIT 10;

-- ========================================
-- TEST 5: Simuler la requête React exacte
-- ========================================

-- Cette requête simule EXACTEMENT ce que fait loadReceivedAssignments()
WITH user_contacts AS (
  SELECT id 
  FROM contacts 
  WHERE user_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
)
SELECT 
  '5️⃣ Simulation requête React' as test,
  ma.id,
  m.reference,
  m.vehicle_brand,
  m.vehicle_model,
  c.email as contact_email,
  ma.user_id,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
WHERE ma.contact_id IN (SELECT id FROM user_contacts)
ORDER BY ma.assigned_at DESC;
