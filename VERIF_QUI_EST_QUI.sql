-- 🔍 VÉRIFICATION CROISÉE - Qui est qui ?

-- ========================================
-- TEST 1: Tous les profils
-- ========================================

SELECT 
  '1️⃣ Tous les profils utilisateurs' as test,
  id as user_id,
  email,
  created_at
FROM profiles
WHERE email IN (
  'mahdi.convoyages@gmail.com',
  'mahdi.benamor1994@gmail.com',
  'convoiexpress95@gmail.com'
)
ORDER BY email;

-- ========================================
-- TEST 2: Tous les contacts et leurs liens
-- ========================================

SELECT 
  '2️⃣ Tous les contacts' as test,
  c.id as contact_id,
  c.email as contact_email,
  c.name as contact_name,
  c.user_id as contact_user_id,
  p.email as user_email_lie
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email IN (
  'mahdi.convoyages@gmail.com',
  'mahdi.benamor1994@gmail.com',
  'convoiexpress95@gmail.com'
)
ORDER BY c.email;

-- ========================================
-- TEST 3: Matrice contact → user
-- ========================================

SELECT 
  '3️⃣ Matrice contact → profil' as test,
  c.email as contact_email,
  c.user_id as contact_user_id,
  p.email as profil_lie,
  CASE 
    WHEN c.email = p.email THEN '✅ Contact = Profil (normal)'
    WHEN c.email != p.email THEN '⚠️ Contact ≠ Profil (problème)'
    WHEN p.email IS NULL THEN '❌ Contact sans profil'
    ELSE '❓ Inconnu'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email IN (
  'mahdi.convoyages@gmail.com',
  'mahdi.benamor1994@gmail.com',
  'convoiexpress95@gmail.com'
)
ORDER BY c.email;
