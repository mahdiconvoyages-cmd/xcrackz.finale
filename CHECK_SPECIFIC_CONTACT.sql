-- Vérifier si le contact sélectionné existe dans la table contacts
SELECT 
  id,
  name,
  email,
  phone,
  user_id
FROM contacts
WHERE id IN (
  'c37f15d6-545a-4792-9697-de03991b4f17',
  'b703be0e-59ba-42e9-8904-c609becd3338'
);

-- Si vide, lister TOUS les contacts pour voir ce qui est disponible
SELECT 
  'TOUS LES CONTACTS' as info,
  id,
  name,
  email,
  user_id
FROM contacts
ORDER BY created_at DESC;
