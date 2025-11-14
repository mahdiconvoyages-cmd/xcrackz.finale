-- ==========================================
-- 🔍 TROUVER LE USER_ID DE mahdi.benamor1994@gmail.com
-- ==========================================

-- 1. Chercher votre profil
SELECT 
  id as user_id, 
  email, 
  full_name,
  is_admin,
  created_at
FROM profiles 
WHERE email = 'mahdi.benamor1994@gmail.com';

-- 2. Vérifier combien de documents vous possédez actuellement
SELECT COUNT(*) as mes_documents
FROM inspection_documents
WHERE user_id = (SELECT id FROM profiles WHERE email = 'mahdi.benamor1994@gmail.com');

-- 3. Si vous n'avez PAS de documents, réassigner TOUS les documents à votre compte
-- ⚠️ Décommentez cette ligne si la requête 2 retourne 0
/*
UPDATE inspection_documents 
SET user_id = (SELECT id FROM profiles WHERE email = 'mahdi.benamor1994@gmail.com')
WHERE user_id IS NOT NULL;
*/

-- 4. Vérification finale
SELECT 
  id.id,
  id.document_title,
  id.document_type,
  id.created_at,
  p.email as proprietaire_email
FROM inspection_documents id
LEFT JOIN profiles p ON p.id = id.user_id
ORDER BY id.created_at DESC;
