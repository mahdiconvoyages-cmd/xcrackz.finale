-- ============================================================================
-- 1. Function: find matches for a new OFFER (reverse direction)
-- ============================================================================
CREATE OR REPLACE FUNCTION find_ride_matches_for_offer(p_offer_id UUID)
RETURNS TABLE(
  request_id UUID, passenger_id UUID, pickup_city TEXT, dropoff_city TEXT,
  detour_km DOUBLE PRECISION, distance_covered_km DOUBLE PRECISION,
  match_score INTEGER, match_type TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_offer RECORD;
  v_earth_radius CONSTANT DOUBLE PRECISION := 6371;
BEGIN
  SELECT * INTO v_offer FROM ride_offers WHERE id = p_offer_id;
  IF v_offer IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH requests AS (
    SELECT
      rr.*,
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(rr.pickup_lat - v_offer.origin_lat) / 2) ^ 2 +
        cos(radians(rr.pickup_lat)) * cos(radians(v_offer.origin_lat)) *
        sin(radians(rr.pickup_lng - v_offer.origin_lng) / 2) ^ 2
      )) AS dist_pickup_to_origin,
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(rr.destination_lat - v_offer.destination_lat) / 2) ^ 2 +
        cos(radians(rr.destination_lat)) * cos(radians(v_offer.destination_lat)) *
        sin(radians(rr.destination_lng - v_offer.destination_lng) / 2) ^ 2
      )) AS dist_dest_to_dest,
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(rr.destination_lat - rr.pickup_lat) / 2) ^ 2 +
        cos(radians(rr.pickup_lat)) * cos(radians(rr.destination_lat)) *
        sin(radians(rr.destination_lng - rr.pickup_lng) / 2) ^ 2
      )) AS passenger_total_distance
    FROM ride_requests rr
    WHERE rr.status = 'active'
      AND rr.user_id != v_offer.user_id
      AND rr.needed_date = v_offer.departure_date
      AND rr.pickup_lat IS NOT NULL
      AND rr.destination_lat IS NOT NULL
  )
  SELECT
    r.id AS request_id,
    r.user_id AS passenger_id,
    CASE WHEN r.dist_pickup_to_origin < 20 THEN v_offer.origin_city ELSE v_offer.destination_city END,
    CASE WHEN r.dist_dest_to_dest < 30 THEN v_offer.destination_city ELSE v_offer.destination_city END,
    r.dist_pickup_to_origin AS detour_km,
    CASE WHEN r.dist_dest_to_dest < 30 THEN r.passenger_total_distance
         ELSE GREATEST(0, r.passenger_total_distance - r.dist_dest_to_dest) END,
    LEAST(100, (
      CASE WHEN r.dist_pickup_to_origin < 5 THEN 35 WHEN r.dist_pickup_to_origin < 10 THEN 28
           WHEN r.dist_pickup_to_origin < 20 THEN 18 WHEN r.dist_pickup_to_origin < 30 THEN 10 ELSE 0 END +
      CASE WHEN r.dist_dest_to_dest < 5 THEN 35 WHEN r.dist_dest_to_dest < 15 THEN 28
           WHEN r.dist_dest_to_dest < 30 THEN 18 WHEN r.dist_dest_to_dest < 50 THEN 10 ELSE 0 END +
      CASE WHEN r.passenger_total_distance > 0 THEN
        LEAST(20, (GREATEST(0, r.passenger_total_distance - r.dist_dest_to_dest) / r.passenger_total_distance * 20)::INTEGER)
      ELSE 10 END +
      CASE WHEN r.dist_pickup_to_origin < 20 AND r.dist_dest_to_dest < 20 THEN 10 ELSE 0 END
    ))::INTEGER,
    CASE WHEN r.dist_pickup_to_origin < 5 THEN 'on_route'
         WHEN r.dist_pickup_to_origin < v_offer.max_detour_km THEN 'small_detour'
         WHEN r.dist_dest_to_dest > 30 THEN 'partial' ELSE 'on_route' END
  FROM requests r
  WHERE (r.dist_pickup_to_origin < GREATEST(v_offer.max_detour_km, r.max_detour_km) OR r.dist_dest_to_dest < 50)
  ORDER BY match_score DESC
  LIMIT 30;
END;
$$;

-- ============================================================================
-- 2. Auto-matching trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_match_on_insert() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match RECORD;
BEGIN
  IF TG_TABLE_NAME = 'ride_offers' THEN
    -- New offer: find matching requests
    FOR v_match IN SELECT * FROM find_ride_matches_for_offer(NEW.id) LOOP
      INSERT INTO ride_matches (offer_id, request_id, driver_id, passenger_id,
        pickup_city, dropoff_city, detour_km, distance_covered_km, match_score, match_type, status)
      VALUES (NEW.id, v_match.request_id, NEW.user_id, v_match.passenger_id,
        v_match.pickup_city, v_match.dropoff_city, v_match.detour_km, v_match.distance_covered_km,
        v_match.match_score, v_match.match_type, 'proposed')
      ON CONFLICT (offer_id, request_id) DO UPDATE SET
        match_score = EXCLUDED.match_score,
        match_type = EXCLUDED.match_type,
        detour_km = EXCLUDED.detour_km,
        distance_covered_km = EXCLUDED.distance_covered_km,
        updated_at = NOW();
    END LOOP;

  ELSIF TG_TABLE_NAME = 'ride_requests' THEN
    -- New request: find matching offers
    FOR v_match IN SELECT * FROM find_ride_matches_for_request(NEW.id) LOOP
      INSERT INTO ride_matches (offer_id, request_id, driver_id, passenger_id,
        pickup_city, dropoff_city, detour_km, distance_covered_km, match_score, match_type, status)
      VALUES (v_match.offer_id, NEW.id, v_match.driver_id, NEW.user_id,
        v_match.pickup_city, v_match.dropoff_city, v_match.detour_km, v_match.distance_covered_km,
        v_match.match_score, v_match.match_type, 'proposed')
      ON CONFLICT (offer_id, request_id) DO UPDATE SET
        match_score = EXCLUDED.match_score,
        match_type = EXCLUDED.match_type,
        detour_km = EXCLUDED.detour_km,
        distance_covered_km = EXCLUDED.distance_covered_km,
        updated_at = NOW();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Drop old triggers if exist, create new auto-match triggers
-- ============================================================================
DROP TRIGGER IF EXISTS trg_auto_match_offer ON ride_offers;
DROP TRIGGER IF EXISTS trg_auto_match_request ON ride_requests;

CREATE TRIGGER trg_auto_match_offer
  AFTER INSERT ON ride_offers
  FOR EACH ROW EXECUTE FUNCTION auto_match_on_insert();

CREATE TRIGGER trg_auto_match_request
  AFTER INSERT ON ride_requests
  FOR EACH ROW EXECUTE FUNCTION auto_match_on_insert();

-- ============================================================================
-- 4. Ensure unique constraint on (offer_id, request_id) exists
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ride_matches_offer_request_unique'
  ) THEN
    ALTER TABLE ride_matches ADD CONSTRAINT ride_matches_offer_request_unique UNIQUE (offer_id, request_id);
  END IF;
END $$;

-- ============================================================================
-- 5. Run matching NOW for all existing active offers/requests
-- ============================================================================
DO $$
DECLARE
  v_req RECORD;
  v_match RECORD;
BEGIN
  FOR v_req IN SELECT id, user_id FROM ride_requests WHERE status = 'active' LOOP
    FOR v_match IN SELECT * FROM find_ride_matches_for_request(v_req.id) LOOP
      INSERT INTO ride_matches (offer_id, request_id, driver_id, passenger_id,
        pickup_city, dropoff_city, detour_km, distance_covered_km, match_score, match_type, status)
      VALUES (v_match.offer_id, v_req.id, v_match.driver_id, v_req.user_id,
        v_match.pickup_city, v_match.dropoff_city, v_match.detour_km, v_match.distance_covered_km,
        v_match.match_score, v_match.match_type, 'proposed')
      ON CONFLICT (offer_id, request_id) DO UPDATE SET
        match_score = EXCLUDED.match_score,
        match_type = EXCLUDED.match_type,
        detour_km = EXCLUDED.detour_km,
        distance_covered_km = EXCLUDED.distance_covered_km,
        updated_at = NOW();
    END LOOP;
  END LOOP;
END $$;
