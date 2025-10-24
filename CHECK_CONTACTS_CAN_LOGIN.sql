-- Vérifier que les contacts ont bien des user_id qui existent dans auth.users
SELECT 
  c.id as contact_id,
  c.name as contact_name,
  c.email as contact_email,
  c.user_id,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ User existe - Peut se connecter'
    ELSE '❌ User n''existe pas - Ne peut PAS se connecter'
  END as status,
  u.email as auth_email
FROM contacts c
LEFT JOIN auth.users u ON c.user_id = u.id
ORDER BY c.created_at DESC;
