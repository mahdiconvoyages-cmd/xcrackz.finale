-- VÉRIFICATION DES UTILISATEURS ET TABLES

-- 1. Voir tous les utilisateurs
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. Voir les profils
SELECT 
  id,
  full_name,
  email,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 3. Vérifier les tables principales
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Créer un utilisateur de test si besoin
-- Décommente et modifie selon tes besoins :
/*
-- Créer utilisateur admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@xcrackz.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
) RETURNING id;

-- Ensuite créer le profil avec l'ID retourné
INSERT INTO profiles (id, full_name, email, role)
VALUES ('<ID_RETOURNE>', 'Admin XCrackz', 'admin@xcrackz.com', 'admin');
*/
