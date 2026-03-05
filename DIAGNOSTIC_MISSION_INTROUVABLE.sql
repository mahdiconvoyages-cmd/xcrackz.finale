-- ============================================================================
-- DIAGNOSTIC : Mission introuvable — vérifier les policies de missions
-- ============================================================================

-- 1. Lister toutes les policies sur la table missions
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY cmd;

-- 2. Vérifier si des tables utilisées dans _loadMission n'ont PAS de policies
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COALESCE(p.policy_count, 0) AS policy_count
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'missions', 'vehicle_inspections', 'profiles', 
    'ride_offers', 'ride_matches', 'inspection_report_shares',
    'public_tracking_links', 'gps_tracking_sessions',
    'inspection_photos_v2', 'inspection_documents', 'inspection_damages'
  )
ORDER BY t.tablename;

-- 3. Tester si la mission est visible pour l'utilisateur
-- Remplace <MISSION_ID> et <USER_ID> par les vraies valeurs
-- SELECT id, user_id, assigned_user_id, status, reference 
-- FROM missions 
-- WHERE id = '<MISSION_ID>';
