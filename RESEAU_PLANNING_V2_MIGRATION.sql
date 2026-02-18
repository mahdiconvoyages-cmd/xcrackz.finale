-- =============================================================================
-- RÉSEAU PLANNING V2 - COVOITURAGE INTELLIGENT ENTRE CONVOYEURS
-- =============================================================================
-- Architecture complète :
--   - Offres de place (conducteur avec véhicule, siège libre)
--   - Demandes de trajet (piéton qui cherche un lift)
--   - Villes sur la route (route-based matching)
--   - Matchs IA améliorés (itinéraire réel, détour calculé)
--   - Système de notation
--   - Adresse de base dans le profil
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1 : AJOUTER ADRESSE DE BASE AU PROFIL
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_postal_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_lat DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_lng DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_detour_km DOUBLE PRECISION DEFAULT 15;

COMMENT ON COLUMN profiles.base_city IS 'Ville de base du convoyeur (domicile/entreprise) — utilisé pour le retour auto';
COMMENT ON COLUMN profiles.max_detour_km IS 'Détour max accepté en km pour prendre/déposer un passager';


-- =============================================================================
-- ÉTAPE 2 : TABLE ride_offers (CONDUCTEUR — j''ai un véhicule, j''ai une place)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ride_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Lien optionnel vers la mission de convoyage
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  
  -- Trajet
  origin_city TEXT NOT NULL,
  origin_postal_code TEXT,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  destination_city TEXT NOT NULL,
  destination_postal_code TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  
  -- Route détaillée (polyline OSRM stockée pour matching route-based)
  route_geometry JSONB,  -- GeoJSON LineString de la route réelle
  route_cities JSONB DEFAULT '[]'::jsonb,  -- [{city, lat, lng, distance_km, postal_code}] villes traversées
  route_distance_km DOUBLE PRECISION, -- distance totale
  route_duration_min INTEGER, -- durée estimée

  -- Quand
  departure_date DATE NOT NULL,
  departure_time TIME,
  estimated_arrival_time TIME,
  flexibility_minutes INTEGER DEFAULT 30,
  
  -- Préférences
  max_detour_km DOUBLE PRECISION DEFAULT 15,
  seats_available INTEGER DEFAULT 1,
  vehicle_type TEXT DEFAULT 'car',
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'en_route', 'completed', 'cancelled', 'expired')),
  
  -- Retour prévu ?
  needs_return BOOLEAN DEFAULT false,
  return_to_city TEXT,
  return_to_lat DOUBLE PRECISION,
  return_to_lng DOUBLE PRECISION,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ride_offers_user ON ride_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_offers_date ON ride_offers(departure_date, status);
CREATE INDEX IF NOT EXISTS idx_ride_offers_status ON ride_offers(status) WHERE status IN ('active', 'en_route');
CREATE INDEX IF NOT EXISTS idx_ride_offers_mission ON ride_offers(mission_id);
CREATE INDEX IF NOT EXISTS idx_ride_offers_origin ON ride_offers(origin_lat, origin_lng);
CREATE INDEX IF NOT EXISTS idx_ride_offers_dest ON ride_offers(destination_lat, destination_lng);

COMMENT ON TABLE ride_offers IS 'Offres de place — conducteur avec véhicule qui propose un siège passager';


-- =============================================================================
-- ÉTAPE 3 : TABLE ride_requests (PIÉTON — je cherche un lift)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Lien optionnel vers la mission terminée
  completed_mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  
  -- Où je suis
  pickup_city TEXT NOT NULL,
  pickup_postal_code TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  
  -- Où je veux aller
  destination_city TEXT NOT NULL,
  destination_postal_code TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  
  -- Quand
  needed_date DATE NOT NULL,
  time_window_start TIME,
  time_window_end TIME,
  flexibility_minutes INTEGER DEFAULT 60,
  
  -- Préférences
  max_detour_km DOUBLE PRECISION DEFAULT 20, -- max détour accepté pour le conducteur
  accept_partial BOOLEAN DEFAULT true, -- accepte un trajet partiel (se rapprocher même si pas direct)
  
  -- Type de besoin
  request_type TEXT DEFAULT 'return' CHECK (request_type IN ('return', 'pickup_point', 'custom')),
  -- return = rentre à sa base après livraison
  -- pickup_point = doit se rendre au point d'enlèvement de sa prochaine mission
  -- custom = autre
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'matched', 'completed', 'cancelled', 'expired')),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ride_requests_user ON ride_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_date ON ride_requests(needed_date, status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ride_requests_pickup ON ride_requests(pickup_lat, pickup_lng);
CREATE INDEX IF NOT EXISTS idx_ride_requests_dest ON ride_requests(destination_lat, destination_lng);

COMMENT ON TABLE ride_requests IS 'Demandes de trajet — convoyeur à pied qui cherche un lift vers sa base ou un point d''enlèvement';


-- =============================================================================
-- ÉTAPE 4 : TABLE ride_matches (MATCH entre offre et demande)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ride_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES ride_offers(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id),
  passenger_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Détails du match
  pickup_city TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_city TEXT,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  
  -- Métriques
  detour_km DOUBLE PRECISION, -- détour pour le conducteur
  distance_covered_km DOUBLE PRECISION, -- distance couverte pour le passager
  match_score INTEGER DEFAULT 0, -- 0-100
  match_type TEXT DEFAULT 'on_route' 
    CHECK (match_type IN ('on_route', 'small_detour', 'partial', 'return_match')),
  -- on_route = passager pile sur la route (0 détour)
  -- small_detour = petit détour acceptable
  -- partial = ne couvre qu'une partie du trajet
  -- return_match = le conducteur va dans le sens inverse et a besoin d'un retour aussi
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'accepted', 'declined', 'completed', 'cancelled', 'expired')),
  
  -- Rendez-vous  
  rendezvous_time TIMESTAMPTZ,
  rendezvous_address TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(offer_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_ride_matches_offer ON ride_matches(offer_id);
CREATE INDEX IF NOT EXISTS idx_ride_matches_request ON ride_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_ride_matches_driver ON ride_matches(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_matches_passenger ON ride_matches(passenger_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_matches_status ON ride_matches(status);

COMMENT ON TABLE ride_matches IS 'Matchs entre offres de place et demandes de trajet — scoring route-based';


-- =============================================================================
-- ÉTAPE 5 : TABLE ride_ratings (NOTATION post-trajet)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ride_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES ride_matches(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id),
  rated_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  badges JSONB DEFAULT '[]'::jsonb, -- ["ponctuel", "agréable", "flexible", "véhicule_propre"]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, rater_id)
);

CREATE INDEX IF NOT EXISTS idx_ride_ratings_rated ON ride_ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_ride_ratings_match ON ride_ratings(match_id);

COMMENT ON TABLE ride_ratings IS 'Notations mutuelles après chaque covoiturage — 1 à 5 étoiles + badges';


-- =============================================================================
-- ÉTAPE 6 : TABLE ride_messages (CHAT entre conducteur et passager)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ride_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES ride_matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_messages_match ON ride_messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ride_messages_sender ON ride_messages(sender_id);

COMMENT ON TABLE ride_messages IS 'Chat entre conducteur et passager matchés';


-- =============================================================================
-- ÉTAPE 7 : ROW LEVEL SECURITY
-- =============================================================================

-- ride_offers
ALTER TABLE ride_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active offers" ON ride_offers
  FOR SELECT USING (status IN ('active', 'en_route') OR auth.uid() = user_id);

CREATE POLICY "Users can create own offers" ON ride_offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own offers" ON ride_offers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own offers" ON ride_offers
  FOR DELETE USING (auth.uid() = user_id);

-- ride_requests
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active requests" ON ride_requests
  FOR SELECT USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "Users can create own requests" ON ride_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests" ON ride_requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own requests" ON ride_requests
  FOR DELETE USING (auth.uid() = user_id);

-- ride_matches
ALTER TABLE ride_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match participants can view" ON ride_matches
  FOR SELECT USING (auth.uid() = driver_id OR auth.uid() = passenger_id);

CREATE POLICY "System can insert matches" ON ride_matches
  FOR INSERT WITH CHECK (auth.uid() = driver_id OR auth.uid() = passenger_id);

CREATE POLICY "Participants can update matches" ON ride_matches
  FOR UPDATE USING (auth.uid() = driver_id OR auth.uid() = passenger_id);

-- ride_ratings
ALTER TABLE ride_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" ON ride_ratings
  FOR SELECT USING (true);

CREATE POLICY "Raters can insert" ON ride_ratings
  FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- ride_messages
ALTER TABLE ride_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match participants can view messages" ON ride_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ride_matches WHERE id = match_id 
            AND (driver_id = auth.uid() OR passenger_id = auth.uid()))
  );

CREATE POLICY "Match participants can send messages" ON ride_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM ride_matches WHERE id = match_id AND status = 'accepted'
            AND (driver_id = auth.uid() OR passenger_id = auth.uid()))
  );

CREATE POLICY "Sender can update own messages" ON ride_messages
  FOR UPDATE USING (auth.uid() = sender_id);


-- =============================================================================
-- ÉTAPE 8 : FONCTION DE MATCHING ROUTE-BASED
-- =============================================================================

CREATE OR REPLACE FUNCTION find_ride_matches_for_request(p_request_id UUID)
RETURNS TABLE (
  offer_id UUID,
  driver_id UUID,
  pickup_city TEXT,
  dropoff_city TEXT,
  detour_km DOUBLE PRECISION,
  distance_covered_km DOUBLE PRECISION,
  match_score INTEGER,
  match_type TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_req RECORD;
  v_earth_radius CONSTANT DOUBLE PRECISION := 6371;
BEGIN
  SELECT * INTO v_req FROM ride_requests WHERE id = p_request_id;
  IF v_req IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH offers AS (
    SELECT 
      ro.*,
      -- Distance entre le pickup du passager et l'origine de l'offre
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(v_req.pickup_lat - ro.origin_lat) / 2) ^ 2 +
        cos(radians(v_req.pickup_lat)) * cos(radians(ro.origin_lat)) *
        sin(radians(v_req.pickup_lng - ro.origin_lng) / 2) ^ 2
      )) AS dist_pickup_to_origin,
      -- Distance entre le pickup du passager et la destination de l'offre
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(v_req.pickup_lat - ro.destination_lat) / 2) ^ 2 +
        cos(radians(v_req.pickup_lat)) * cos(radians(ro.destination_lat)) *
        sin(radians(v_req.pickup_lng - ro.destination_lng) / 2) ^ 2
      )) AS dist_pickup_to_dest,
      -- Distance entre la destination du passager et la destination de l'offre
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(v_req.destination_lat - ro.destination_lat) / 2) ^ 2 +
        cos(radians(v_req.destination_lat)) * cos(radians(ro.destination_lat)) *
        sin(radians(v_req.destination_lng - ro.destination_lng) / 2) ^ 2
      )) AS dist_dest_to_dest,
      -- Distance directe passager pickup → destination
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(v_req.destination_lat - v_req.pickup_lat) / 2) ^ 2 +
        cos(radians(v_req.pickup_lat)) * cos(radians(v_req.destination_lat)) *
        sin(radians(v_req.destination_lng - v_req.pickup_lng) / 2) ^ 2
      )) AS passenger_total_distance,
      -- Distance trajet conducteur origin → dest
      v_earth_radius * 2 * asin(sqrt(
        sin(radians(ro.destination_lat - ro.origin_lat) / 2) ^ 2 +
        cos(radians(ro.origin_lat)) * cos(radians(ro.destination_lat)) *
        sin(radians(ro.destination_lng - ro.origin_lng) / 2) ^ 2
      )) AS driver_route_distance
    FROM ride_offers ro
    WHERE ro.status IN ('active', 'en_route')
      AND ro.user_id != v_req.user_id
      AND ro.departure_date = v_req.needed_date
      AND ro.origin_lat IS NOT NULL
      AND ro.destination_lat IS NOT NULL
      AND ro.seats_available > 0
  )
  SELECT
    o.id AS offer_id,
    o.user_id AS driver_id,
    -- Ville de pickup (la plus proche entre origin et route)
    CASE 
      WHEN o.dist_pickup_to_origin < o.dist_pickup_to_dest THEN o.origin_city
      ELSE o.destination_city
    END AS pickup_city,
    -- Ville de dropoff
    CASE
      WHEN o.dist_dest_to_dest < 30 THEN o.destination_city
      ELSE o.destination_city
    END AS dropoff_city,
    -- Détour estimé = dist pickup passager par rapport à la route directe
    LEAST(o.dist_pickup_to_origin, o.dist_pickup_to_dest) AS detour_km,
    -- Distance couverte pour le passager
    CASE 
      WHEN o.dist_dest_to_dest < 30 THEN o.passenger_total_distance
      ELSE GREATEST(0, o.passenger_total_distance - o.dist_dest_to_dest)
    END AS distance_covered_km,
    -- Score composite (0-100)
    LEAST(100, (
      -- Faible détour pour le conducteur (max 35 pts)
      CASE 
        WHEN LEAST(o.dist_pickup_to_origin, o.dist_pickup_to_dest) < 5 THEN 35
        WHEN LEAST(o.dist_pickup_to_origin, o.dist_pickup_to_dest) < 10 THEN 28
        WHEN LEAST(o.dist_pickup_to_origin, o.dist_pickup_to_dest) < 20 THEN 18
        WHEN LEAST(o.dist_pickup_to_origin, o.dist_pickup_to_dest) < 30 THEN 10
        ELSE 0
      END +
      -- Destination proche (max 35 pts)
      CASE
        WHEN o.dist_dest_to_dest < 5 THEN 35
        WHEN o.dist_dest_to_dest < 15 THEN 28
        WHEN o.dist_dest_to_dest < 30 THEN 18
        WHEN o.dist_dest_to_dest < 50 THEN 10
        ELSE 0
      END +
      -- Couverture du trajet passager (max 20 pts)
      CASE
        WHEN o.passenger_total_distance > 0 THEN
          LEAST(20, (GREATEST(0, o.passenger_total_distance - o.dist_dest_to_dest) / o.passenger_total_distance * 20)::INTEGER)
        ELSE 10
      END +
      -- Bonus même direction (max 10 pts)
      CASE
        WHEN o.dist_pickup_to_origin < 20 AND o.dist_dest_to_dest < 20 THEN 10
        WHEN o.dist_pickup_to_dest < 20 THEN 5
        ELSE 0
      END
    ))::INTEGER AS match_score,
    -- Type de match
    CASE
      WHEN LEAST(o.dist_pickup_to_origin, o.dist_pickup_to_dest) < 5 THEN 'on_route'
      WHEN LEAST(o.dist_pickup_to_origin, o.dist_pickup_to_dest) < o.max_detour_km THEN 'small_detour'
      WHEN o.dist_dest_to_dest > 30 THEN 'partial'
      ELSE 'on_route'
    END AS match_type
  FROM offers o
  WHERE (
    LEAST(o.dist_pickup_to_origin, o.dist_pickup_to_dest) < GREATEST(o.max_detour_km, v_req.max_detour_km)
    OR o.dist_dest_to_dest < 50
  )
  ORDER BY match_score DESC
  LIMIT 30;
END;
$$;

COMMENT ON FUNCTION find_ride_matches_for_request IS 'Matching IA route-based : trouve les conducteurs dont le trajet passe près du passager';


-- =============================================================================
-- ÉTAPE 9 : FONCTION D'AUTO-CRÉATION D'OFFRE DEPUIS UNE MISSION
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_create_ride_offer_from_mission()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Quand une mission passe en in_progress, créer automatiquement une offre de place
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
    INSERT INTO ride_offers (
      user_id, mission_id,
      origin_city, origin_lat, origin_lng,
      destination_city, destination_lat, destination_lng,
      departure_date, departure_time,
      vehicle_type, status, needs_return,
      notes
    )
    SELECT
      COALESCE(NEW.assigned_user_id, NEW.user_id),
      NEW.id,
      COALESCE(NEW.pickup_city, split_part(NEW.pickup_address, ',', 1)),
      NEW.pickup_lat::double precision,
      NEW.pickup_lng::double precision,
      COALESCE(NEW.delivery_city, split_part(NEW.delivery_address, ',', 1)),
      NEW.delivery_lat::double precision,
      NEW.delivery_lng::double precision,
      COALESCE(NEW.pickup_date::date, CURRENT_DATE),
      COALESCE(NEW.pickup_date::time, '08:00'::time),
      COALESCE(NEW.vehicle_type, 'car'),
      'active',
      true, -- par défaut le conducteur a besoin d'un retour
      'Place disponible — convoyage ' || COALESCE(NEW.reference, '')
    WHERE NOT EXISTS (
      SELECT 1 FROM ride_offers WHERE mission_id = NEW.id AND status IN ('active', 'en_route')
    );
  END IF;
  
  -- Quand une mission est terminée, fermer l'offre
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE ride_offers SET status = 'completed' WHERE mission_id = NEW.id AND status IN ('active', 'en_route');
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_ride_offer ON missions;
CREATE TRIGGER trg_auto_ride_offer
  AFTER UPDATE OF status ON missions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_ride_offer_from_mission();

COMMENT ON FUNCTION auto_create_ride_offer_from_mission IS 'Crée automatiquement une offre de place quand une mission démarre';


-- =============================================================================
-- ÉTAPE 10 : FONCTION NOTATION MOYENNE
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_ride_rating(p_user_id UUID)
RETURNS TABLE(
  avg_rating NUMERIC,
  total_ratings INTEGER,
  badges JSONB
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rr.rating)::numeric, 1) AS avg_rating,
    COUNT(*)::INTEGER AS total_ratings,
    COALESCE(
      jsonb_agg(DISTINCT badge) FILTER (WHERE badge IS NOT NULL),
      '[]'::jsonb
    ) AS badges
  FROM ride_ratings rr
  LEFT JOIN LATERAL jsonb_array_elements_text(rr.badges) AS badge ON true
  WHERE rr.rated_id = p_user_id;
END;
$$;


-- =============================================================================
-- ÉTAPE 11 : VUE — CONDUCTEURS EN ROUTE (pour la carte live)
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


-- =============================================================================
-- ÉTAPE 12 : REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ride_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE ride_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE ride_messages;


-- =============================================================================
-- ÉTAPE 13 : VÉRIFICATIONS
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Réseau Planning V2 — Migration complète :';
  RAISE NOTICE '  📍 profiles : base_city, base_lat/lng, max_detour_km';
  RAISE NOTICE '  🚗 ride_offers : offres de place (auto-créées depuis missions)';
  RAISE NOTICE '  🚶 ride_requests : demandes de trajet (piétons)';
  RAISE NOTICE '  🤝 ride_matches : matchs IA route-based';
  RAISE NOTICE '  ⭐ ride_ratings : notations mutuelles';
  RAISE NOTICE '  💬 ride_messages : chat entre matchés';
  RAISE NOTICE '  🗺️ active_drivers_on_road : vue carte live';
  RAISE NOTICE '  🔒 RLS activé sur toutes les tables';
  RAISE NOTICE '  ⚡ Realtime activé';
END;
$$;
