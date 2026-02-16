-- Vérifier les assignations créées
SELECT 
  ma.id,
  ma.mission_id,
  ma.contact_id,
  c.name as contact_name,
  c.user_id as contact_user_id,
  u.email as user_email_qui_doit_recevoir,
  ma.created_at
FROM mission_assignments ma
JOIN contacts c ON ma.contact_id = c.id
LEFT JOIN auth.users u ON c.user_id = u.id
ORDER BY ma.created_at DESC
LIMIT 5;

-- Trouver l'ID du user mahdi.convoyages@gmail.com
SELECT 
  'USER mahdi.convoyages' as info,
  id as user_id,
  email
FROM auth.users
WHERE email = 'mahdi.convoyages@gmail.com';

-- Vérifier si ce user a des assignations
SELECT 
  'ASSIGNATIONS POUR mahdi.convoyages' as info,
  ma.*
FROM mission_assignments ma
JOIN contacts c ON ma.contact_id = c.id
WHERE c.user_id = (SELECT id FROM auth.users WHERE email = 'mahdi.convoyages@gmail.com');
