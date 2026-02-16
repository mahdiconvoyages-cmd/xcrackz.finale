-- Vérifier combien d'utilisateurs dans auth.users vs profiles
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles;

-- Voir tous les utilisateurs disponibles
SELECT 
  u.id,
  u.email,
  p.first_name,
  p.last_name,
  CASE WHEN p.id IS NULL THEN '❌ Pas de profil' ELSE '✅ Profil existe' END as status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.email;

-- Voir ce que retournerait la requête du code
SELECT id, email, first_name, last_name
FROM profiles
WHERE id != '784dd826-62ae-4d94-81a0-618953d63010'  -- Votre ID
ORDER BY email;
