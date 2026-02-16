-- ================================================
-- VÉRIFIER LA STRUCTURE EXACTE DE mission_assignments
-- ================================================

-- 1. Afficher TOUTES les colonnes de mission_assignments
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'mission_assignments'
ORDER BY ordinal_position;

-- 2. Si la table n'existe pas, chercher des tables similaires
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%assign%'
ORDER BY table_name;

-- 3. Chercher aussi les tables avec "mission" dans le nom
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%mission%'
ORDER BY table_name;

SELECT '📊 Vérification de la structure des tables' as status;
