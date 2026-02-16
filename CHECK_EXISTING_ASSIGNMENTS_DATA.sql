-- Vérifier les assignations existantes et leurs IDs
SELECT 
  ma.id,
  ma.contact_id,
  c.name as contact_name,
  c.user_id as user_id_from_contact,
  u.email as user_email
FROM mission_assignments ma
LEFT JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN auth.users u ON u.id = c.user_id
ORDER BY ma.created_at DESC;

-- Vérifier si les contact_id sont dans contacts ou auth.users
SELECT 
  'Dans contacts' as source,
  COUNT(*) as count
FROM mission_assignments ma
WHERE EXISTS (SELECT 1 FROM contacts c WHERE c.id = ma.contact_id)

UNION ALL

SELECT 
  'Dans auth.users' as source,
  COUNT(*) as count
FROM mission_assignments ma
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ma.contact_id);
