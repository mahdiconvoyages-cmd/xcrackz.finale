-- ============================================================
-- AUTO_EXPIRE_PAST_TRIPS.sql
-- Expiration automatique des trajets/plannings publiés passés
--
-- Problème : les trajets dont la date est dépassée restent
-- en status 'published' et apparaissent dans les résultats.
--
-- Solution :
--   1. Fonction expire_past_trips() qui passe les vieux
--      trajets en 'completed'
--   2. pg_cron pour appeler cette fonction toutes les heures
--      (activer pg_cron via Supabase Dashboard → Extensions)
-- ============================================================

-- ── 1. Corriger immédiatement les trajets déjà expirés ──────

-- Table covoiturage_trips (hook useCovoiturage)
UPDATE covoiturage_trips
SET status = 'completed'
WHERE status = 'published'
  AND departure_date < CURRENT_DATE;

-- Table carpooling_trips (service carpoolingService)
UPDATE carpooling_trips
SET status = 'completed'
WHERE status IN ('active', 'published')
  AND departure_datetime < NOW();

-- Table convoy_plannings (réseau planning lifts)
UPDATE convoy_plannings
SET status = 'completed'
WHERE status = 'published'
  AND departure_datetime < NOW();

-- Table carpooling_rides_pro (si elle existe encore)
UPDATE carpooling_rides_pro
SET status = 'completed'
WHERE status = 'published'
  AND departure_datetime < NOW();

SELECT 'Trajets expirés mis à jour ✅' AS result;

-- ── 2. Fonction de maintenance appelable par pg_cron ────────

CREATE OR REPLACE FUNCTION expire_past_trips()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cov  INTEGER := 0;
  v_carp INTEGER := 0;
  v_plan INTEGER := 0;
BEGIN
  -- covoiturage_trips
  UPDATE covoiturage_trips
  SET status = 'completed'
  WHERE status = 'published'
    AND departure_date < CURRENT_DATE;
  GET DIAGNOSTICS v_cov = ROW_COUNT;

  -- carpooling_trips
  UPDATE carpooling_trips
  SET status = 'completed'
  WHERE status IN ('active', 'published')
    AND departure_datetime < NOW();
  GET DIAGNOSTICS v_carp = ROW_COUNT;

  -- convoy_plannings
  UPDATE convoy_plannings
  SET status = 'completed'
  WHERE status = 'published'
    AND departure_datetime < NOW();
  GET DIAGNOSTICS v_plan = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_at', NOW(),
    'covoiturage_trips', v_cov,
    'carpooling_trips',  v_carp,
    'convoy_plannings',  v_plan,
    'total',             v_cov + v_carp + v_plan
  );
END;
$$;

-- ── 3. Planifier via pg_cron (toutes les heures) ────────────
-- Activer d'abord pg_cron :
--   Supabase Dashboard → Database → Extensions → pg_cron → Enable
--
-- Puis décommenter :
-- SELECT cron.schedule(
--   'expire-past-trips',     -- nom du job
--   '0 * * * *',             -- toutes les heures pile
--   $$SELECT expire_past_trips()$$
-- );

-- ── 4. Vérifier ─────────────────────────────────────────────
SELECT expire_past_trips() AS expiration_result;
