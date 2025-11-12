-- ================================================
-- DIAGNOSTIC: Vérifier le vrai nom de la colonne
-- Exécute ce script dans Supabase SQL Editor
-- ================================================

-- 1. Lister TOUTES les colonnes de la table missions
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'missions'
ORDER BY ordinal_position;

-- 2. Chercher spécifiquement les colonnes "assigned"
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'missions'
  AND column_name LIKE '%assigned%';

-- 3. Afficher un exemple de mission pour voir les vraies colonnes
SELECT *
FROM public.missions
LIMIT 1;
