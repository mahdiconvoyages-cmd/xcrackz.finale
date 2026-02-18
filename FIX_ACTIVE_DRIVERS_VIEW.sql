-- =============================================================================
-- FIX: active_drivers_on_road — INNER JOIN ride_offers (plus de LEFT JOIN)
-- =============================================================================
-- Avant : LEFT JOIN ride_offers → TOUS les convoyeurs en mission apparaissaient
-- Après : INNER JOIN ride_offers → seuls ceux qui ont publié une offre de place
--         dans le Réseau Planning apparaissent sur la carte live.
-- =============================================================================

CREATE OR REPLACE VIEW active_drivers_on_road AS
SELECT 
  mtl.mission_id,
  mtl.user_id AS driver_id,
  mtl.latitude AS current_lat,
  mtl.longitude AS current_lng,
  mtl.speed,
  mtl.bearing,
  mtl.last_update,
  mtl.battery_level,
  m.reference,
  m.pickup_address,
  m.pickup_city,
  m.delivery_address,
  m.delivery_city,
  m.vehicle_brand,
  m.vehicle_model,
  m.vehicle_type,
  p.first_name,
  p.last_name,
  p.company_name,
  p.avatar_url,
  ro.id AS offer_id,
  ro.seats_available,
  ro.max_detour_km,
  ro.route_cities,
  EXTRACT(EPOCH FROM (NOW() - mtl.last_update)) AS seconds_since_update,
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - mtl.last_update)) < 120 THEN 'live'
    WHEN EXTRACT(EPOCH FROM (NOW() - mtl.last_update)) < 600 THEN 'recent'
    ELSE 'stale'
  END AS freshness
FROM mission_tracking_live mtl
INNER JOIN missions m ON m.id = mtl.mission_id
INNER JOIN profiles p ON p.id = mtl.user_id
INNER JOIN ride_offers ro ON ro.mission_id = mtl.mission_id AND ro.status IN ('active', 'en_route')
WHERE mtl.is_active = true
  AND m.status = 'in_progress'
ORDER BY mtl.last_update DESC;

COMMENT ON VIEW active_drivers_on_road IS 'Conducteurs en route ayant publié une offre de place — seuls les convoyeurs inscrits au réseau planning apparaissent';
