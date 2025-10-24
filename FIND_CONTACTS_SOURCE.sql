-- ================================================
-- TROUVER OÙ SONT STOCKÉS LES CONTACTS/CHAUFFEURS
-- ================================================

-- 1. Chercher l'ID dans différentes tables
SELECT 'auth.users' as source_table, id::text as id, email 
FROM auth.users 
WHERE id = 'c37f15d6-545a-4792-9697-de03991b4f17'
UNION ALL
SELECT 'contacts' as source_table, id::text, name as email
FROM contacts 
WHERE id = 'c37f15d6-545a-4792-9697-de03991b4f17'
UNION ALL
SELECT 'profiles' as source_table, id::text, COALESCE(first_name || ' ' || last_name, email) as email
FROM profiles 
WHERE id = 'c37f15d6-545a-4792-9697-de03991b4f17';

-- 2. Lister TOUS les contacts disponibles
SELECT 
  'CONTACTS DISPONIBLES' as info,
  id,
  name,
  email,
  phone,
  user_id
FROM contacts
LIMIT 10;

-- 3. Vérifier la structure de la table contacts
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'contacts'
ORDER BY ordinal_position;

-- 4. Comprendre la relation: contacts appartient à quel user?
SELECT 
  c.id as contact_id,
  c.name as contact_name,
  c.user_id,
  u.email as user_email
FROM contacts c
LEFT JOIN auth.users u ON c.user_id = u.id
LIMIT 5;

SELECT '📊 Analyse des contacts terminée' as status;
