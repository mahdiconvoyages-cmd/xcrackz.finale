-- ==========================================
-- 🔧 RÉASSIGNER LES DOCUMENTS - 3 SCÉNARIOS
-- ==========================================

-- SCÉNARIO A: Vous êtes connecté avec a2cpartenaire@aol.com (4 documents)
-- → Vous voyez déjà 4 documents ✅

-- SCÉNARIO B: Vous êtes connecté avec mahdi.convoyages@gmail.com (1 document)
-- → Vous voyez 1 document ✅

-- SCÉNARIO C: Vous êtes connecté avec convoiexpress95@gmail.com (1 document)
-- → Vous voyez 1 document ✅

-- SCÉNARIO D: Vous êtes connecté avec mahdi.benamor1994@gmail.com (0 documents)
-- → Vous ne voyez RIEN ❌
-- → Solution: Réassigner TOUS les documents à ce compte

-- ==========================================
-- 📊 DIAGNOSTIC: Quel email utilisez-vous?
-- ==========================================

-- 1. Vérifier les 4 comptes possibles
SELECT 
  email,
  id as user_id,
  full_name,
  is_admin,
  (SELECT COUNT(*) FROM inspection_documents WHERE user_id = profiles.id) as nb_documents
FROM profiles 
WHERE email IN (
  'mahdi.benamor1994@gmail.com',
  'a2cpartenaire@aol.com',
  'mahdi.convoyages@gmail.com',
  'convoiexpress95@gmail.com'
)
ORDER BY nb_documents DESC;

-- ==========================================
-- 🔧 SOLUTION 1: RÉASSIGNER À a2cpartenaire@aol.com
-- (Si vous voulez tout centraliser sur ce compte)
-- ==========================================
/*
UPDATE inspection_documents 
SET user_id = (SELECT id FROM profiles WHERE email = 'a2cpartenaire@aol.com')
WHERE user_id IN (
  SELECT id FROM profiles WHERE email IN ('mahdi.convoyages@gmail.com', 'convoiexpress95@gmail.com')
);
*/

-- ==========================================
-- 🔧 SOLUTION 2: CRÉER ET RÉASSIGNER À mahdi.benamor1994@gmail.com
-- (Si ce compte existe dans auth.users mais pas dans profiles)
-- ==========================================
/*
-- D'abord, vérifier si le compte existe dans auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'mahdi.benamor1994@gmail.com';

-- Si le compte existe, créer le profil
INSERT INTO profiles (id, email, full_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'mahdi.benamor1994@gmail.com'),
  'mahdi.benamor1994@gmail.com',
  'Mahdi Ben Amor'
);

-- Puis réassigner tous les documents
UPDATE inspection_documents 
SET user_id = (SELECT id FROM profiles WHERE email = 'mahdi.benamor1994@gmail.com')
WHERE user_id IS NOT NULL;
*/

-- ==========================================
-- ✅ VÉRIFICATION FINALE
-- ==========================================
SELECT 
  p.email,
  COUNT(id.*) as total_documents
FROM profiles p
LEFT JOIN inspection_documents id ON id.user_id = p.id
WHERE p.email IN (
  'mahdi.benamor1994@gmail.com',
  'a2cpartenaire@aol.com',
  'mahdi.convoyages@gmail.com',
  'convoiexpress95@gmail.com'
)
GROUP BY p.email
ORDER BY total_documents DESC;
