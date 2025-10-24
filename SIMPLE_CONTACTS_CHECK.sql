-- ================================================
-- ANALYSE SIMPLE: Comprendre la structure des contacts
-- ================================================

-- 1. Afficher quelques contacts de la table
SELECT 
  id,
  name,
  email,
  phone,
  user_id,
  created_at
FROM contacts
ORDER BY created_at DESC
LIMIT 5;

-- 2. Vérifier si contact_id doit pointer vers contacts ou vers auth.users
SELECT 
  'Table contacts - colonnes' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'contacts'
ORDER BY ordinal_position;

-- 3. Voir la contrainte actuelle sur mission_assignments
SELECT
  constraint_name,
  table_name,
  column_name,
  ordinal_position
FROM information_schema.key_column_usage
WHERE table_name = 'mission_assignments'
AND constraint_name LIKE '%contact%';
