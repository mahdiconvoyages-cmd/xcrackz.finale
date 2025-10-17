-- 🔍 DEBUG ULTIME: Pourquoi "Mes Missions" ne fonctionne toujours pas ?

-- ========================================
-- TEST 1: Simulation exacte de la requête React
-- ========================================

-- Remplacez par l'email de l'utilisateur connecté
WITH user_contacts AS (
  SELECT id, name, email
  FROM contacts
  WHERE user_id = (SELECT id FROM profiles WHERE email = 'convoiexpress95@gmail.com')  -- ⚠️ VOTRE EMAIL
)
SELECT 
  '1️⃣ Simulation requête React' as test,
  ma.*,
  m.reference,
  m.vehicle_brand,
  m.vehicle_model,
  m.pickup_address,
  m.delivery_address,
  c.name as contact_name
FROM user_contacts uc
JOIN mission_assignments ma ON ma.contact_id = uc.id
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 2: Vérifier RLS pour cet utilisateur
-- ========================================

-- Cette requête vérifie si RLS bloque l'accès
SELECT 
  '2️⃣ Test RLS' as test,
  auth.uid() as current_user_id,
  ma.id,
  ma.user_id as assignation_user_id,
  ma.contact_id,
  c.user_id as contact_user_id,
  CASE 
    WHEN ma.user_id = auth.uid() THEN '✅ Autorisé par ma.user_id'
    WHEN c.user_id = auth.uid() THEN '✅ Autorisé par c.user_id'
    ELSE '❌ RLS BLOQUE'
  END as rls_status
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE ma.user_id = (SELECT id FROM profiles WHERE email = 'convoiexpress95@gmail.com')  -- ⚠️ VOTRE EMAIL
   OR c.user_id = (SELECT id FROM profiles WHERE email = 'convoiexpress95@gmail.com');  -- ⚠️ VOTRE EMAIL

-- ========================================
-- TEST 3: Requête EXACTE utilisée par le code
-- ========================================

-- Cette requête utilise .in() comme dans le code React
SELECT 
  '3️⃣ Requête avec IN()' as test,
  ma.*,
  m.*
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
WHERE ma.contact_id IN (
  SELECT id FROM contacts 
  WHERE user_id = (SELECT id FROM profiles WHERE email = 'convoiexpress95@gmail.com')  -- ⚠️ VOTRE EMAIL
)
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 4: Votre profil et contacts
-- ========================================

SELECT 
  '4️⃣ Votre profil' as test,
  p.id as user_id,
  p.email,
  c.id as contact_id,
  c.name as contact_name,
  c.user_id as contact_user_id,
  CASE 
    WHEN p.id = c.user_id THEN '✅ Lié correctement'
    ELSE '❌ PROBLÈME de lien'
  END as lien
FROM profiles p
LEFT JOIN contacts c ON c.user_id = p.id
WHERE p.email = 'convoiexpress95@gmail.com';  -- ⚠️ VOTRE EMAIL

-- ========================================
-- TEST 5: TOUTES les assignations (pour comparaison)
-- ========================================

SELECT 
  '5️⃣ Toutes les assignations' as test,
  m.reference,
  c.name as contact,
  c.email as contact_email,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  ma.status,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
ORDER BY ma.assigned_at DESC;

-- ========================================
-- TEST 6: Vérifier si le problème vient de RLS
-- ========================================

-- Désactiver temporairement RLS pour tester (⚠️ DANGEREUX en prod)
-- ALTER TABLE mission_assignments DISABLE ROW LEVEL SECURITY;
-- Puis réactiver:
-- ALTER TABLE mission_assignments ENABLE ROW LEVEL SECURITY;

SELECT 
  '6️⃣ État RLS' as test,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'mission_assignments';
