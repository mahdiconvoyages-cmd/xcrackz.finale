-- ============================================================
-- TRACKING PAR CODE : Politique RLS pour accès anon par share_code
-- Permet à la page publique /suivi de chercher une mission
-- par son code de partage (share_code) sans authentification
-- ============================================================

-- 1. Policy anon SELECT sur missions par share_code
-- Autorise uniquement la lecture des missions en cours ou terminées
-- via leur share_code (le client ne peut pas lister toutes les missions)
DROP POLICY IF EXISTS "missions_anon_by_share_code" ON public.missions;
CREATE POLICY "missions_anon_by_share_code"
  ON public.missions
  FOR SELECT TO anon
  USING (
    share_code IS NOT NULL
    AND status IN ('in_progress', 'completed')
  );

-- 2. S'assurer que anon a le GRANT SELECT sur missions
-- (déjà fait dans FIX_PUBLIC_TRACKING_RLS.sql mais on le refait au cas où)
GRANT SELECT ON public.missions TO anon;

-- 3. S'assurer que anon peut lire mission_tracking_live et history
GRANT SELECT ON public.mission_tracking_live TO anon;
GRANT SELECT ON public.mission_tracking_history TO anon;
GRANT SELECT ON public.profiles TO anon;

-- 4. Policy anon sur mission_tracking_live (si pas déjà en place)
DROP POLICY IF EXISTS "tracking_live_anon_by_mission" ON public.mission_tracking_live;
CREATE POLICY "tracking_live_anon_by_mission"
  ON public.mission_tracking_live
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_tracking_live.mission_id
        AND m.share_code IS NOT NULL
        AND m.status IN ('in_progress', 'completed')
    )
  );

-- 5. Policy anon sur mission_tracking_history
DROP POLICY IF EXISTS "tracking_history_anon_by_mission" ON public.mission_tracking_history;
CREATE POLICY "tracking_history_anon_by_mission"
  ON public.mission_tracking_history
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_tracking_history.mission_id
        AND m.share_code IS NOT NULL
        AND m.status IN ('in_progress', 'completed')
    )
  );

-- 6. Policy anon sur profiles (nom du chauffeur seulement)
DROP POLICY IF EXISTS "profiles_anon_driver_for_tracking" ON public.profiles;
CREATE POLICY "profiles_anon_driver_for_tracking"
  ON public.profiles
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.assigned_user_id = profiles.id
        AND m.share_code IS NOT NULL
        AND m.status IN ('in_progress', 'completed')
    )
  );
