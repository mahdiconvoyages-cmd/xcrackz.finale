-- ============================================================================
-- Migration: Ajout ville de retour pour les trajets retour
-- Le convoyeur précise dans quelle ville il rentre pour matcher avec 
-- d'autres convoyeurs allant dans cette direction
-- ============================================================================

-- 1. Ajouter les colonnes de ville de retour
ALTER TABLE convoy_plannings 
  ADD COLUMN IF NOT EXISTS return_city TEXT,
  ADD COLUMN IF NOT EXISTS return_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS return_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS return_lng DOUBLE PRECISION;

-- 2. Commentaires
COMMENT ON COLUMN convoy_plannings.return_city IS 'Ville de retour du convoyeur (où il rentre à vide)';
COMMENT ON COLUMN convoy_plannings.return_lat IS 'Latitude de la ville de retour';
COMMENT ON COLUMN convoy_plannings.return_lng IS 'Longitude de la ville de retour';

-- 3. Index pour recherche de retours
CREATE INDEX IF NOT EXISTS idx_convoy_plannings_return_city ON convoy_plannings(return_city) WHERE return_city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_convoy_plannings_return_geo ON convoy_plannings(return_lat, return_lng) WHERE return_lat IS NOT NULL;

-- 4. Mettre à jour la fonction AI matching pour intégrer les retours
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
      v_planning.is_return_trip AS src_return,
      v_planning.return_lat AS src_r_lat,
      v_planning.return_lng AS src_r_lng,
      v_planning.return_city AS src_r_city
  ),
  candidates AS (
    SELECT 
      cp.*,
      s.*,
      -- Distance entre origines
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
      -- Distance croisée (origin candidat -> dest source) pour retours classiques
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(cp.origin_lat - s.src_d_lat) / 2) ^ 2 +
        cos(radians(s.src_d_lat)) * cos(radians(cp.origin_lat)) *
        sin(radians(cp.origin_lng - s.src_d_lng) / 2) ^ 2
      )) AS cross_distance_km,
      -- *** NOUVEAU: Distance retour → origine du candidat ***
      -- Si le source a une ville de retour, distance entre return_city et l'origine du candidat
      CASE WHEN s.src_r_lat IS NOT NULL THEN
        v_earth_radius * 2 * asin(sqrt(
          sin(radians(cp.origin_lat - s.src_r_lat) / 2) ^ 2 +
          cos(radians(s.src_r_lat)) * cos(radians(cp.origin_lat)) *
          sin(radians(cp.origin_lng - s.src_r_lng) / 2) ^ 2
        ))
      ELSE NULL END AS return_to_origin_km,
      -- *** NOUVEAU: Distance destination du candidat → ville de retour du source ***
      CASE WHEN s.src_r_lat IS NOT NULL THEN
        v_earth_radius * 2 * asin(sqrt(
          sin(radians(cp.destination_lat - s.src_r_lat) / 2) ^ 2 +
          cos(radians(s.src_r_lat)) * cos(radians(cp.destination_lat)) *
          sin(radians(cp.destination_lng - s.src_r_lng) / 2) ^ 2
        ))
      ELSE NULL END AS return_to_dest_km,
      -- *** NOUVEAU: Si le candidat a un retour, distance entre les deux villes de retour ***
      CASE WHEN s.src_r_lat IS NOT NULL AND cp.return_lat IS NOT NULL THEN
        v_earth_radius * 2 * asin(sqrt(
          sin(radians(cp.return_lat - s.src_r_lat) / 2) ^ 2 +
          cos(radians(s.src_r_lat)) * cos(radians(cp.return_lat)) *
          sin(radians(cp.return_lng - s.src_r_lng) / 2) ^ 2
        ))
      ELSE NULL END AS return_to_return_km,
      -- Overlap temporel en minutes
      GREATEST(0, 
        EXTRACT(EPOCH FROM (LEAST(cp.end_time, s.src_end) - GREATEST(cp.start_time, s.src_start))) / 60
      )::INTEGER AS time_overlap
    FROM convoy_plannings cp
    CROSS JOIN source s
    WHERE cp.id != s.src_id
      AND cp.user_id != s.src_user
      AND cp.status = 'published'
      -- Même date OU date +1 pour retour le lendemain
      AND cp.planning_date BETWEEN s.src_date AND s.src_date + INTERVAL '1 day'
      AND cp.origin_lat IS NOT NULL
      AND cp.destination_lat IS NOT NULL
  )
  SELECT 
    c.id AS matched_planning_id,
    c.user_id AS matched_user_id,
    -- Score composite amélioré
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
           ELSE 5 END +
      -- *** BONUS RETOUR: Si le trajet du candidat passe par/va vers la ville de retour ***
      CASE 
        -- Le candidat va vers ma ville de retour (sa destination = mon retour)
        WHEN c.return_to_dest_km IS NOT NULL AND c.return_to_dest_km < 15 THEN 30
        WHEN c.return_to_dest_km IS NOT NULL AND c.return_to_dest_km < 30 THEN 20
        -- Le candidat part de ma ville de retour (route complémentaire)
        WHEN c.return_to_origin_km IS NOT NULL AND c.return_to_origin_km < 15 THEN 25
        WHEN c.return_to_origin_km IS NOT NULL AND c.return_to_origin_km < 30 THEN 15
        -- Les deux retournent au même endroit
        WHEN c.return_to_return_km IS NOT NULL AND c.return_to_return_km < 15 THEN 35
        WHEN c.return_to_return_km IS NOT NULL AND c.return_to_return_km < 30 THEN 20
        ELSE 0
      END
    ))::INTEGER AS match_score,
    -- Type de match élargi
    CASE 
      WHEN c.origin_distance_km < 15 AND c.dest_distance_km < 15 THEN 'same_route'
      -- NOUVEAU: match retour quand le candidat va vers ma ville de retour
      WHEN c.src_r_lat IS NOT NULL AND c.return_to_dest_km IS NOT NULL AND c.return_to_dest_km < 30 THEN 'return_opportunity'
      -- NOUVEAU: les deux retournent au même endroit  
      WHEN c.src_r_lat IS NOT NULL AND c.return_to_return_km IS NOT NULL AND c.return_to_return_km < 30 THEN 'return_opportunity'
      WHEN c.cross_distance_km < 15 THEN 'return_opportunity'
      WHEN c.origin_distance_km < 50 OR c.dest_distance_km < 50 THEN 'nearby_route'
      ELSE 'time_overlap'
    END AS match_type,
    -- Distance la plus pertinente
    LEAST(
      c.origin_distance_km, 
      c.dest_distance_km,
      COALESCE(c.return_to_dest_km, 9999),
      COALESCE(c.return_to_origin_km, 9999),
      COALESCE(c.return_to_return_km, 9999)
    ) AS distance_km,
    c.time_overlap AS time_overlap_minutes,
    -- KM économisés
    CASE 
      WHEN c.origin_distance_km < 15 AND c.dest_distance_km < 15 THEN c.origin_distance_km + c.dest_distance_km
      WHEN c.return_to_dest_km IS NOT NULL AND c.return_to_dest_km < 30 THEN c.return_to_dest_km * 2
      WHEN c.return_to_return_km IS NOT NULL AND c.return_to_return_km < 30 THEN c.return_to_return_km * 2
      WHEN c.cross_distance_km < 15 THEN c.cross_distance_km * 2
      ELSE LEAST(c.origin_distance_km, c.dest_distance_km)
    END AS potential_km_saved
  FROM candidates c
  WHERE (
    c.origin_distance_km < 50 
    OR c.dest_distance_km < 50 
    OR c.cross_distance_km < 50
    -- NOUVEAU: inclure les candidats proches de ma ville de retour
    OR (c.return_to_dest_km IS NOT NULL AND c.return_to_dest_km < 50)
    OR (c.return_to_origin_km IS NOT NULL AND c.return_to_origin_km < 50)
    OR (c.return_to_return_km IS NOT NULL AND c.return_to_return_km < 50)
  )
    AND c.time_overlap > 0
  ORDER BY match_score DESC
  LIMIT 20;
END;
$$;
