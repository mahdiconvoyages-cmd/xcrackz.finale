-- ================================================
-- VÉRIFICATION STRUCTURE TABLES
-- ================================================

-- Voir la structure exacte de la table missions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'missions'
ORDER BY ordinal_position;

-- Voir toutes les politiques RLS actuelles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('missions', 'vehicle_inspections', 'user_credits')
ORDER BY tablename, policyname;

-- Compter les missions (sans RLS)
SET ROLE postgres;
SELECT COUNT(*) as total_missions FROM missions;
SELECT COUNT(*) as total_inspections FROM vehicle_inspections;
SELECT COUNT(*) as total_credits FROM user_credits;
RESET ROLE;
