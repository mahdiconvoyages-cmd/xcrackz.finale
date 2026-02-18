-- =============================================================================
-- RÉSEAU PLANNING V2 — CORRECTIFS P0 + P1
-- =============================================================================
-- Fix 2: Auto-offer trigger → utiliser les coordonnées GPS de la mission
-- Fix 6: Décrémenter seats_available quand un match est accepté  
-- Fix 7: Auto-expirer les offres/demandes anciennes
-- =============================================================================

-- =============================================================================
-- FIX 2: TRIGGER AUTO-OFFER — UTILISER LES COORDS DE LA MISSION
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
      true,
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

-- Recréer le trigger
DROP TRIGGER IF EXISTS trg_auto_ride_offer ON missions;
CREATE TRIGGER trg_auto_ride_offer
  AFTER UPDATE OF status ON missions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_ride_offer_from_mission();


-- =============================================================================
-- FIX 6: DÉCRÉMENTER seats_available QUAND MATCH ACCEPTÉ 
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_ride_match_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Quand un match passe en 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Décrémenter les places disponibles
    UPDATE ride_offers 
    SET seats_available = GREATEST(0, seats_available - 1),
        updated_at = NOW()
    WHERE id = NEW.offer_id;
    
    -- Mettre à jour la request en 'matched'
    UPDATE ride_requests 
    SET status = 'matched', updated_at = NOW()
    WHERE id = NEW.request_id AND status = 'active';
  END IF;
  
  -- Quand un match est décliné ou annulé après avoir été accepté, rendre la place
  IF NEW.status IN ('declined', 'cancelled') AND OLD.status = 'accepted' THEN
    UPDATE ride_offers 
    SET seats_available = seats_available + 1,
        updated_at = NOW()
    WHERE id = NEW.offer_id;
    
    -- Réactiver la request si elle était 'matched'
    UPDATE ride_requests
    SET status = 'active', updated_at = NOW()
    WHERE id = NEW.request_id AND status = 'matched';
  END IF;
  
  -- Quand un match est complété
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Vérifier si toutes les places sont utilisées
    UPDATE ride_offers
    SET status = CASE WHEN seats_available <= 0 THEN 'completed' ELSE status END,
        updated_at = NOW()
    WHERE id = NEW.offer_id;
    
    UPDATE ride_requests
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ride_match_status ON ride_matches;
CREATE TRIGGER trg_ride_match_status
  AFTER UPDATE OF status ON ride_matches
  FOR EACH ROW
  EXECUTE FUNCTION handle_ride_match_status_change();

COMMENT ON FUNCTION handle_ride_match_status_change IS 'Gère les effets de bord quand un match change de statut: places, request status';


-- =============================================================================
-- FIX 7: EXPIRATION AUTOMATIQUE (offres/demandes de plus de 24h après la date)
-- =============================================================================

CREATE OR REPLACE FUNCTION expire_old_ride_entries()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Expirer les offres dont la date de départ est passée depuis 24h
  UPDATE ride_offers 
  SET status = 'expired', updated_at = NOW()
  WHERE status IN ('active') 
    AND departure_date < CURRENT_DATE - INTERVAL '1 day';
    
  -- Expirer les demandes dont la date est passée depuis 24h
  UPDATE ride_requests 
  SET status = 'expired', updated_at = NOW()
  WHERE status IN ('active')
    AND needed_date < CURRENT_DATE - INTERVAL '1 day';
    
  -- Expirer les matchs proposés non répondus depuis +48h
  UPDATE ride_matches
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'proposed'
    AND created_at < NOW() - INTERVAL '48 hours';
END;
$$;

COMMENT ON FUNCTION expire_old_ride_entries IS 'Expire automatiquement les offres/demandes/matchs périmés';

-- Créer un cron job via pg_cron (si disponible sur Supabase)
-- SELECT cron.schedule('expire-rides', '0 */6 * * *', 'SELECT expire_old_ride_entries()');

-- En attendant pg_cron, on peut aussi mettre expires_at au moment de la création
-- et filtrer côté client. Ajoutons un trigger qui set expires_at automatiquement :

CREATE OR REPLACE FUNCTION set_ride_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'ride_offers' THEN
    NEW.expires_at := (NEW.departure_date + INTERVAL '1 day')::timestamptz;
  ELSIF TG_TABLE_NAME = 'ride_requests' THEN
    NEW.expires_at := (NEW.needed_date + INTERVAL '1 day')::timestamptz;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_offer_expiry ON ride_offers;
CREATE TRIGGER trg_set_offer_expiry
  BEFORE INSERT OR UPDATE OF departure_date ON ride_offers
  FOR EACH ROW EXECUTE FUNCTION set_ride_expiration();

DROP TRIGGER IF EXISTS trg_set_request_expiry ON ride_requests;
CREATE TRIGGER trg_set_request_expiry
  BEFORE INSERT OR UPDATE OF needed_date ON ride_requests
  FOR EACH ROW EXECUTE FUNCTION set_ride_expiration();


-- =============================================================================
-- FIX ACTIVE_DRIVERS_ON_ROAD VIEW (rappel — INNER JOIN)
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


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Correctifs P0+P1 appliqués :';
  RAISE NOTICE '  🔧 auto_create_ride_offer_from_mission: utilise pickup_lat/lng et delivery_lat/lng';
  RAISE NOTICE '  🔧 handle_ride_match_status_change: seats_available -1 quand accepté, +1 si annulé';
  RAISE NOTICE '  🔧 expire_old_ride_entries: expire offres/demandes/matchs périmés';
  RAISE NOTICE '  🔧 set_ride_expiration: auto-set expires_at sur insert';
  RAISE NOTICE '  🔧 active_drivers_on_road: INNER JOIN ride_offers confirmé';
END;
$$;
