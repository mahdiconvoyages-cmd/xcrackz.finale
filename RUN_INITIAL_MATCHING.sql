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
        match_score = EXCLUDED.match_score, match_type = EXCLUDED.match_type,
        detour_km = EXCLUDED.detour_km, distance_covered_km = EXCLUDED.distance_covered_km,
        updated_at = NOW();
    END LOOP;
  END LOOP;
END $$;
