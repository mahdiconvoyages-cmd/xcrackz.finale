-- Migration: Ajout table navigation_sessions pour Mapbox Navigation
-- Date: 2025-10-12
-- Description: Tracking sessions de navigation GPS avec monitoring quota Mapbox

-- Table principale
CREATE TABLE IF NOT EXISTS navigation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  
  -- Informations route
  distance_meters NUMERIC, -- Distance totale prévue
  estimated_duration_seconds INTEGER, -- Durée estimée
  
  -- Progression temps réel
  distance_remaining_meters NUMERIC, -- Distance restante
  duration_remaining_seconds INTEGER, -- Temps restant
  percent_complete NUMERIC DEFAULT 0, -- Pourcentage complété
  last_update TIMESTAMPTZ, -- Dernière mise à jour position
  
  -- Optimisation et cache
  from_cache BOOLEAN DEFAULT FALSE, -- Route récupérée du cache (pas de consommation API)
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_navigation_sessions_mission 
  ON navigation_sessions(mission_id);

CREATE INDEX IF NOT EXISTS idx_navigation_sessions_created 
  ON navigation_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_navigation_sessions_status 
  ON navigation_sessions(status);

CREATE INDEX IF NOT EXISTS idx_navigation_sessions_active 
  ON navigation_sessions(started_at DESC) 
  WHERE status = 'active';

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_navigation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_navigation_sessions_updated_at
  BEFORE UPDATE ON navigation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_navigation_sessions_updated_at();

-- RLS (Row Level Security)
ALTER TABLE navigation_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture - Utilisateurs peuvent voir leurs sessions
CREATE POLICY "Users can view their navigation sessions"
  ON navigation_sessions FOR SELECT
  USING (
    mission_id IN (
      SELECT id FROM missions 
      WHERE user_id = auth.uid() OR driver_id = auth.uid()
    )
  );

-- Policy: Insertion - Utilisateurs peuvent créer des sessions
CREATE POLICY "Users can create navigation sessions"
  ON navigation_sessions FOR INSERT
  WITH CHECK (
    mission_id IN (
      SELECT id FROM missions 
      WHERE user_id = auth.uid() OR driver_id = auth.uid()
    )
  );

-- Policy: Mise à jour - Utilisateurs peuvent mettre à jour leurs sessions
CREATE POLICY "Users can update their navigation sessions"
  ON navigation_sessions FOR UPDATE
  USING (
    mission_id IN (
      SELECT id FROM missions 
      WHERE user_id = auth.uid() OR driver_id = auth.uid()
    )
  );

-- Policy: Suppression - Utilisateurs peuvent supprimer leurs sessions
CREATE POLICY "Users can delete their navigation sessions"
  ON navigation_sessions FOR DELETE
  USING (
    mission_id IN (
      SELECT id FROM missions 
      WHERE user_id = auth.uid() OR driver_id = auth.uid()
    )
  );

-- Vue: Statistiques mensuelles (monitoring quota Mapbox)
CREATE OR REPLACE VIEW navigation_monthly_stats AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_sessions,
  COUNT(*) FILTER (WHERE from_cache = TRUE) as cached_sessions,
  COUNT(*) FILTER (WHERE from_cache = FALSE) as api_sessions,
  SUM(distance_meters) as total_distance_meters,
  AVG(distance_meters) as avg_distance_meters,
  SUM(estimated_duration_seconds) as total_duration_seconds,
  AVG(estimated_duration_seconds) as avg_duration_seconds,
  -- Monitoring quota (25k free tier)
  COUNT(*) FILTER (WHERE from_cache = FALSE) as mapbox_sessions_used,
  25000 - COUNT(*) FILTER (WHERE from_cache = FALSE) as mapbox_quota_remaining,
  ROUND(
    (COUNT(*) FILTER (WHERE from_cache = FALSE)::NUMERIC / 25000 * 100),
    2
  ) as mapbox_quota_percent_used,
  -- Estimation coûts (0.50$ par session au-delà de 25k)
  CASE 
    WHEN COUNT(*) FILTER (WHERE from_cache = FALSE) > 25000 
    THEN (COUNT(*) FILTER (WHERE from_cache = FALSE) - 25000) * 0.50
    ELSE 0 
  END as mapbox_overage_cost_usd
FROM navigation_sessions
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Vue: Statistiques par mission
CREATE OR REPLACE VIEW navigation_mission_stats AS
SELECT 
  m.id as mission_id,
  m.reference,
  m.status as mission_status,
  COUNT(ns.id) as navigation_attempts,
  MAX(ns.created_at) as last_navigation_at,
  SUM(CASE WHEN ns.status = 'completed' THEN 1 ELSE 0 END) as completed_navigations,
  AVG(ns.distance_meters) as avg_distance_meters,
  AVG(ns.estimated_duration_seconds) as avg_duration_seconds
FROM missions m
LEFT JOIN navigation_sessions ns ON ns.mission_id = m.id
GROUP BY m.id, m.reference, m.status;

-- Fonction: Obtenir stats mois courant
CREATE OR REPLACE FUNCTION get_current_month_navigation_stats()
RETURNS TABLE (
  total_sessions BIGINT,
  active_sessions BIGINT,
  completed_sessions BIGINT,
  cancelled_sessions BIGINT,
  cached_sessions BIGINT,
  api_sessions BIGINT,
  total_distance_km NUMERIC,
  avg_distance_km NUMERIC,
  mapbox_quota_used BIGINT,
  mapbox_quota_remaining BIGINT,
  mapbox_quota_percent NUMERIC,
  mapbox_cost_usd NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_sessions,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_sessions,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_sessions,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled_sessions,
    COUNT(*) FILTER (WHERE from_cache = TRUE)::BIGINT as cached_sessions,
    COUNT(*) FILTER (WHERE from_cache = FALSE)::BIGINT as api_sessions,
    ROUND(SUM(distance_meters) / 1000, 2) as total_distance_km,
    ROUND(AVG(distance_meters) / 1000, 2) as avg_distance_km,
    COUNT(*) FILTER (WHERE from_cache = FALSE)::BIGINT as mapbox_quota_used,
    (25000 - COUNT(*) FILTER (WHERE from_cache = FALSE))::BIGINT as mapbox_quota_remaining,
    ROUND((COUNT(*) FILTER (WHERE from_cache = FALSE)::NUMERIC / 25000 * 100), 2) as mapbox_quota_percent,
    CASE 
      WHEN COUNT(*) FILTER (WHERE from_cache = FALSE) > 25000 
      THEN (COUNT(*) FILTER (WHERE from_cache = FALSE) - 25000) * 0.50
      ELSE 0 
    END as mapbox_cost_usd
  FROM navigation_sessions
  WHERE created_at >= DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON TABLE navigation_sessions IS 'Sessions de navigation GPS Mapbox avec monitoring quota';
COMMENT ON COLUMN navigation_sessions.from_cache IS 'True si route récupérée du cache (économie API)';
COMMENT ON VIEW navigation_monthly_stats IS 'Statistiques mensuelles avec monitoring quota Mapbox (25k free tier)';
COMMENT ON FUNCTION get_current_month_navigation_stats IS 'Obtenir statistiques navigation du mois en cours';

-- Données de test (optionnel - à commenter en production)
-- INSERT INTO navigation_sessions (mission_id, distance_meters, estimated_duration_seconds, status, from_cache)
-- SELECT 
--   m.id,
--   (RANDOM() * 50000 + 1000)::NUMERIC, -- 1-50km
--   (RANDOM() * 3600 + 300)::INTEGER, -- 5-60min
--   CASE 
--     WHEN RANDOM() < 0.8 THEN 'completed'
--     WHEN RANDOM() < 0.95 THEN 'cancelled'
--     ELSE 'active'
--   END,
--   RANDOM() < 0.3 -- 30% from cache
-- FROM missions m
-- LIMIT 100;

-- Vérifications
SELECT 
  'navigation_sessions table created' as status,
  COUNT(*) as row_count 
FROM navigation_sessions;

SELECT * FROM get_current_month_navigation_stats();
