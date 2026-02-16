-- ============================================================================
-- Migration: Planning Network Optimization for Convoyeurs
-- Réseau de synchronisation de planning pour réduire les trajets à vide
-- ============================================================================

-- 1. Table principale des plannings publiés
CREATE TABLE IF NOT EXISTS convoy_plannings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  planning_date DATE NOT NULL,
  -- Flexibilité horaire
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  flexibility_minutes INTEGER DEFAULT 30,
  -- Trajet principal
  origin_city TEXT NOT NULL,
  origin_postal_code TEXT,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  destination_city TEXT NOT NULL,
  destination_postal_code TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  -- Statut et visibilité
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
  is_return_trip BOOLEAN DEFAULT false,
  -- Véhicule requis / type de convoyage
  vehicle_category TEXT DEFAULT 'all' CHECK (vehicle_category IN ('all', 'car', 'utility', 'truck', 'motorcycle')),
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Points de passage (waypoints) pour chaque planning
CREATE TABLE IF NOT EXISTS planning_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID NOT NULL REFERENCES convoy_plannings(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  postal_code TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  arrival_time TIME,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Matchs IA entre plannings compatibles
CREATE TABLE IF NOT EXISTS planning_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_a_id UUID NOT NULL REFERENCES convoy_plannings(id) ON DELETE CASCADE,
  planning_b_id UUID NOT NULL REFERENCES convoy_plannings(id) ON DELETE CASCADE,
  user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Score de compatibilité (0-100)
  match_score INTEGER NOT NULL DEFAULT 0,
  -- Détails du matching
  match_type TEXT NOT NULL CHECK (match_type IN ('same_route', 'return_opportunity', 'nearby_route', 'time_overlap')),
  distance_km DOUBLE PRECISION,
  time_overlap_minutes INTEGER,
  potential_km_saved DOUBLE PRECISION,
  -- Statut de la proposition
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  -- Notification envoyée ?
  notified_a BOOLEAN DEFAULT false,
  notified_b BOOLEAN DEFAULT false,
  -- Metadata
  match_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Empêcher les doublons
  CONSTRAINT unique_match UNIQUE (planning_a_id, planning_b_id)
);

-- 4. Statistiques d'optimisation par utilisateur
CREATE TABLE IF NOT EXISTS planning_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Période
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  -- Métriques
  plannings_published INTEGER DEFAULT 0,
  matches_found INTEGER DEFAULT 0,
  matches_accepted INTEGER DEFAULT 0,
  km_saved DOUBLE PRECISION DEFAULT 0,
  hours_saved DOUBLE PRECISION DEFAULT 0,
  empty_trips_avoided INTEGER DEFAULT 0,
  co2_saved_kg DOUBLE PRECISION DEFAULT 0,
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_month UNIQUE (user_id, month, year)
);

-- ============================================================================
-- INDEXES pour performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_convoy_plannings_user ON convoy_plannings(user_id);
CREATE INDEX IF NOT EXISTS idx_convoy_plannings_date ON convoy_plannings(planning_date);
CREATE INDEX IF NOT EXISTS idx_convoy_plannings_status ON convoy_plannings(status);
CREATE INDEX IF NOT EXISTS idx_convoy_plannings_origin ON convoy_plannings(origin_city);
CREATE INDEX IF NOT EXISTS idx_convoy_plannings_dest ON convoy_plannings(destination_city);
CREATE INDEX IF NOT EXISTS idx_convoy_plannings_geo ON convoy_plannings(origin_lat, origin_lng, destination_lat, destination_lng);

CREATE INDEX IF NOT EXISTS idx_planning_waypoints_planning ON planning_waypoints(planning_id);
CREATE INDEX IF NOT EXISTS idx_planning_matches_users ON planning_matches(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_planning_matches_status ON planning_matches(status);
CREATE INDEX IF NOT EXISTS idx_planning_stats_user ON planning_stats(user_id, year, month);

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE convoy_plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_stats ENABLE ROW LEVEL SECURITY;

-- Convoy plannings: les publiés sont visibles par tous, sinon uniquement par le propriétaire
CREATE POLICY "Users can view published plannings" ON convoy_plannings
  FOR SELECT USING (status = 'published' OR auth.uid() = user_id);

CREATE POLICY "Users can insert own plannings" ON convoy_plannings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plannings" ON convoy_plannings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plannings" ON convoy_plannings
  FOR DELETE USING (auth.uid() = user_id);

-- Waypoints: visibles via le planning parent
CREATE POLICY "Users can view waypoints of visible plannings" ON planning_waypoints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM convoy_plannings 
      WHERE id = planning_id 
      AND (status = 'published' OR user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage own waypoints" ON planning_waypoints
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM convoy_plannings WHERE id = planning_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own waypoints" ON planning_waypoints
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM convoy_plannings WHERE id = planning_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own waypoints" ON planning_waypoints
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM convoy_plannings WHERE id = planning_id AND user_id = auth.uid())
  );

-- Matches: visibles par les deux parties
CREATE POLICY "Users can view own matches" ON planning_matches
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "System can insert matches" ON planning_matches
  FOR INSERT WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can update own matches" ON planning_matches
  FOR UPDATE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Stats: uniquement ses propres stats
CREATE POLICY "Users can view own stats" ON planning_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own stats" ON planning_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON planning_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTION: AI Matching - Trouve les plannings compatibles
-- ============================================================================

CREATE OR REPLACE FUNCTION find_planning_matches(p_planning_id UUID)
RETURNS TABLE (
  matched_planning_id UUID,
  matched_user_id UUID,
  match_score INTEGER,
  match_type TEXT,
  distance_km DOUBLE PRECISION,
  time_overlap_minutes INTEGER,
  potential_km_saved DOUBLE PRECISION
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_planning RECORD;
  v_earth_radius CONSTANT DOUBLE PRECISION := 6371; -- km
BEGIN
  -- Récupérer le planning source
  SELECT * INTO v_planning FROM convoy_plannings WHERE id = p_planning_id;
  
  IF v_planning IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH source AS (
    SELECT 
      v_planning.id AS src_id,
      v_planning.user_id AS src_user,
      v_planning.planning_date AS src_date,
      v_planning.start_time AS src_start,
      v_planning.end_time AS src_end,
      v_planning.flexibility_minutes AS src_flex,
      v_planning.origin_lat AS src_o_lat,
      v_planning.origin_lng AS src_o_lng,
      v_planning.destination_lat AS src_d_lat,
      v_planning.destination_lng AS src_d_lng,
      v_planning.is_return_trip AS src_return
  ),
  candidates AS (
    SELECT 
      cp.*,
      -- Distance entre origines (formule Haversine simplifiée)
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(cp.origin_lat - s.src_o_lat) / 2) ^ 2 +
        cos(radians(s.src_o_lat)) * cos(radians(cp.origin_lat)) *
        sin(radians(cp.origin_lng - s.src_o_lng) / 2) ^ 2
      )) AS origin_distance_km,
      -- Distance entre destinations
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(cp.destination_lat - s.src_d_lat) / 2) ^ 2 +
        cos(radians(s.src_d_lat)) * cos(radians(cp.destination_lat)) *
        sin(radians(cp.destination_lng - s.src_d_lng) / 2) ^ 2
      )) AS dest_distance_km,
      -- Distance croisée (origin A -> dest B) pour retours
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(cp.origin_lat - s.src_d_lat) / 2) ^ 2 +
        cos(radians(s.src_d_lat)) * cos(radians(cp.origin_lat)) *
        sin(radians(cp.origin_lng - s.src_d_lng) / 2) ^ 2
      )) AS cross_distance_km,
      -- Overlap temporel en minutes
      GREATEST(0, 
        EXTRACT(EPOCH FROM (LEAST(cp.end_time, s.src_end) - GREATEST(cp.start_time, s.src_start))) / 60
      )::INTEGER AS time_overlap
    FROM convoy_plannings cp
    CROSS JOIN source s
    WHERE cp.id != s.src_id
      AND cp.user_id != s.src_user
      AND cp.status = 'published'
      AND cp.planning_date = s.src_date
      AND cp.origin_lat IS NOT NULL
      AND cp.destination_lat IS NOT NULL
  )
  SELECT 
    c.id AS matched_planning_id,
    c.user_id AS matched_user_id,
    -- Score composite
    LEAST(100, (
      -- Proximité des origines (max 40 pts)
      CASE WHEN c.origin_distance_km < 5 THEN 40
           WHEN c.origin_distance_km < 15 THEN 30
           WHEN c.origin_distance_km < 30 THEN 20
           WHEN c.origin_distance_km < 50 THEN 10
           ELSE 0 END +
      -- Proximité des destinations (max 40 pts)
      CASE WHEN c.dest_distance_km < 5 THEN 40
           WHEN c.dest_distance_km < 15 THEN 30
           WHEN c.dest_distance_km < 30 THEN 20
           WHEN c.dest_distance_km < 50 THEN 10
           ELSE 0 END +
      -- Overlap temporel (max 20 pts)
      CASE WHEN c.time_overlap > 120 THEN 20
           WHEN c.time_overlap > 60 THEN 15
           WHEN c.time_overlap > 30 THEN 10
           ELSE 5 END
    ))::INTEGER AS match_score,
    -- Type de match
    CASE 
      WHEN c.origin_distance_km < 15 AND c.dest_distance_km < 15 THEN 'same_route'
      WHEN c.cross_distance_km < 15 THEN 'return_opportunity'
      WHEN c.origin_distance_km < 50 OR c.dest_distance_km < 50 THEN 'nearby_route'
      ELSE 'time_overlap'
    END AS match_type,
    LEAST(c.origin_distance_km, c.dest_distance_km) AS distance_km,
    c.time_overlap AS time_overlap_minutes,
    -- KM économisés estimés (distance croisée ou distance directe selon le type)
    CASE 
      WHEN c.origin_distance_km < 15 AND c.dest_distance_km < 15 THEN c.origin_distance_km + c.dest_distance_km
      WHEN c.cross_distance_km < 15 THEN c.cross_distance_km * 2
      ELSE LEAST(c.origin_distance_km, c.dest_distance_km)
    END AS potential_km_saved
  FROM candidates c
  WHERE (c.origin_distance_km < 50 OR c.dest_distance_km < 50 OR c.cross_distance_km < 50)
    AND c.time_overlap > 0
  ORDER BY match_score DESC
  LIMIT 20;
END;
$$;

-- ============================================================================
-- FUNCTION: Geocode ville via api-adresse.data.gouv.fr (appel client-side)
-- Note: Le geocoding est fait côté client, cette function stocke les résultats
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_planning_stats(
  p_user_id UUID,
  p_km_saved DOUBLE PRECISION DEFAULT 0,
  p_hours_saved DOUBLE PRECISION DEFAULT 0,
  p_match_accepted BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month INTEGER := EXTRACT(MONTH FROM now());
  v_year INTEGER := EXTRACT(YEAR FROM now());
BEGIN
  INSERT INTO planning_stats (user_id, month, year, plannings_published, matches_found, matches_accepted, km_saved, hours_saved, empty_trips_avoided, co2_saved_kg)
  VALUES (p_user_id, v_month, v_year, 1, 0, 
    CASE WHEN p_match_accepted THEN 1 ELSE 0 END,
    p_km_saved, p_hours_saved,
    CASE WHEN p_km_saved > 0 THEN 1 ELSE 0 END,
    p_km_saved * 0.12 -- ~120g CO2/km
  )
  ON CONFLICT (user_id, month, year)
  DO UPDATE SET
    plannings_published = planning_stats.plannings_published + 1,
    matches_accepted = planning_stats.matches_accepted + CASE WHEN p_match_accepted THEN 1 ELSE 0 END,
    km_saved = planning_stats.km_saved + p_km_saved,
    hours_saved = planning_stats.hours_saved + p_hours_saved,
    empty_trips_avoided = planning_stats.empty_trips_avoided + CASE WHEN p_km_saved > 0 THEN 1 ELSE 0 END,
    co2_saved_kg = planning_stats.co2_saved_kg + (p_km_saved * 0.12),
    updated_at = now();
END;
$$;

-- ============================================================================
-- Enable realtime for planning tables
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE convoy_plannings;
ALTER PUBLICATION supabase_realtime ADD TABLE planning_matches;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE convoy_plannings IS 'Plannings publiés par les convoyeurs pour synchronisation de trajets';
COMMENT ON TABLE planning_waypoints IS 'Points de passage intermédiaires des plannings';
COMMENT ON TABLE planning_matches IS 'Matchs IA entre plannings compatibles';
COMMENT ON TABLE planning_stats IS 'Statistiques mensuelles d optimisation par utilisateur';
COMMENT ON FUNCTION find_planning_matches IS 'Algorithme IA de matching: score basé sur proximité géographique, overlap temporel et type de trajet';
