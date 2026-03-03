-- ============================================================================
-- PURGE: mission_tracking_history + mission_tracking_live
-- ============================================================================
-- PROBLÈME: Les tables de tracking GPS grossissent indéfiniment.
-- - mission_tracking_history: ~960 lignes par mission (1 ligne/15s sur 4h)
-- - Sans purge : des millions de lignes en quelques mois
-- SOLUTION: Purge automatique via pg_cron (disponible sur Supabase)
-- ============================================================================

-- 1. Supprimer les positions GPS de plus de 30 jours
--    (Garder 30j pour les archives, réduire à 7 si stockage critique)
CREATE INDEX IF NOT EXISTS idx_tracking_history_recorded_at
  ON public.mission_tracking_history (recorded_at);

CREATE INDEX IF NOT EXISTS idx_tracking_history_mission_id
  ON public.mission_tracking_history (mission_id);

-- 2. Fonction de purge
CREATE OR REPLACE FUNCTION public.purge_old_tracking_history()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Supprimer l'historique GPS de plus de 30 jours
  DELETE FROM public.mission_tracking_history
  WHERE recorded_at < NOW() - INTERVAL '30 days';

  -- Supprimer les entrées live inactives de plus de 7 jours
  DELETE FROM public.mission_tracking_live
  WHERE is_active = false
    AND last_update < NOW() - INTERVAL '7 days';
END;
$$;

-- 3. Planifier la purge chaque nuit à 3h00 via pg_cron
--    Décommenter si pg_cron est activé sur votre projet Supabase
--    (Dashboard → Database → Extensions → pg_cron)
-- SELECT cron.schedule(
--   'purge-tracking-history',
--   '0 3 * * *',
--   'SELECT public.purge_old_tracking_history()'
-- );

-- 4. Purge manuelle immédiate (à exécuter maintenant si la table est déjà grosse)
SELECT public.purge_old_tracking_history();

-- 5. Vérification : nombre de lignes restantes
SELECT
  'mission_tracking_history' AS table_name,
  COUNT(*) AS rows,
  MIN(recorded_at) AS oldest,
  MAX(recorded_at) AS newest
FROM public.mission_tracking_history
UNION ALL
SELECT
  'mission_tracking_live',
  COUNT(*),
  MIN(last_update),
  MAX(last_update)
FROM public.mission_tracking_live;

-- ============================================================================
-- POUR ACTIVER pg_cron SUR SUPABASE :
-- Dashboard → Database → Extensions → chercher "pg_cron" → Activer
-- Puis décommenter le cron.schedule() ci-dessus
-- ============================================================================
