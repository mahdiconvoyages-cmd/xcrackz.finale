-- =============================================================================
-- RÉSEAU PLANNING V2 — CORRECTIFS P2 + P3 (100% PARFAIT)
-- =============================================================================
-- Fix 1: Ride lifecycle — in_transit, completed, cancelled states
-- Fix 2: Rating UI support (CHECK constraint update)
-- Fix 3: Cancel after acceptance support
-- Fix 4: Notifications V2 → trigger sur ride_matches et ride_messages
-- Fix 6: Visibility toggle — status 'paused' pour offres
-- =============================================================================


-- =============================================================================
-- 1. ÉTENDRE LES CHECK CONSTRAINTS POUR SUPPORTER TOUS LES STATUTS
-- =============================================================================

-- ride_matches: ajouter in_transit et cancelled
ALTER TABLE ride_matches DROP CONSTRAINT IF EXISTS ride_matches_status_check;
ALTER TABLE ride_matches ADD CONSTRAINT ride_matches_status_check 
  CHECK (status IN ('proposed', 'accepted', 'in_transit', 'completed', 'declined', 'cancelled', 'expired'));

-- ride_offers: ajouter paused  
ALTER TABLE ride_offers DROP CONSTRAINT IF EXISTS ride_offers_status_check;
ALTER TABLE ride_offers ADD CONSTRAINT ride_offers_status_check 
  CHECK (status IN ('active', 'paused', 'en_route', 'completed', 'cancelled', 'expired'));

-- ride_requests: inchangé mais on confirme
ALTER TABLE ride_requests DROP CONSTRAINT IF EXISTS ride_requests_status_check;
ALTER TABLE ride_requests ADD CONSTRAINT ride_requests_status_check 
  CHECK (status IN ('active', 'matched', 'completed', 'cancelled', 'expired'));


-- =============================================================================
-- 2. METTRE À JOUR handle_ride_match_status_change POUR in_transit + cancelled
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_ride_match_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Quand un match passe en 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE ride_offers 
    SET seats_available = GREATEST(0, seats_available - 1), updated_at = NOW()
    WHERE id = NEW.offer_id;
    UPDATE ride_requests 
    SET status = 'matched', updated_at = NOW()
    WHERE id = NEW.request_id AND status = 'active';
  END IF;
  
  -- Quand le trajet démarre (in_transit)
  IF NEW.status = 'in_transit' AND OLD.status = 'accepted' THEN
    UPDATE ride_offers 
    SET status = 'en_route', updated_at = NOW()
    WHERE id = NEW.offer_id AND status = 'active';
  END IF;
  
  -- Quand un match est complété
  IF NEW.status = 'completed' AND OLD.status IN ('accepted', 'in_transit') THEN
    UPDATE ride_offers
    SET status = CASE WHEN seats_available <= 0 THEN 'completed' ELSE status END,
        updated_at = NOW()
    WHERE id = NEW.offer_id;
    UPDATE ride_requests
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.request_id;
  END IF;
  
  -- Quand un match est décliné ou annulé après avoir été accepté/in_transit
  IF NEW.status IN ('declined', 'cancelled') AND OLD.status IN ('accepted', 'in_transit') THEN
    UPDATE ride_offers 
    SET seats_available = seats_available + 1,
        status = CASE WHEN status = 'en_route' THEN 'active' ELSE status END,
        updated_at = NOW()
    WHERE id = NEW.offer_id;
    UPDATE ride_requests
    SET status = 'active', updated_at = NOW()
    WHERE id = NEW.request_id AND status = 'matched';
  END IF;
  
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 3. NOTIFICATIONS V2 — TRIGGER SUR ride_matches ET ride_messages
-- =============================================================================

-- S'assurer que la table planning_notifications existe
CREATE TABLE IF NOT EXISTS planning_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE planning_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON planning_notifications;
CREATE POLICY "Users see own notifications" ON planning_notifications
  FOR ALL USING (user_id = auth.uid());

-- Trigger: notifier sur changement de statut ride_matches
CREATE OR REPLACE FUNCTION notify_on_ride_match_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _driver_name TEXT;
  _passenger_name TEXT;
  _title TEXT;
  _body TEXT;
  _target_user UUID;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, 'Un conducteur') INTO _driver_name 
    FROM profiles WHERE id = NEW.driver_id;
  SELECT COALESCE(first_name || ' ' || last_name, 'Un passager') INTO _passenger_name 
    FROM profiles WHERE id = NEW.passenger_id;

  -- Nouveau match proposé → notifier le passager
  IF TG_OP = 'INSERT' AND NEW.status = 'proposed' THEN
    _target_user := NEW.passenger_id;
    _title := '🎯 Nouveau match trouvé !';
    _body := _driver_name || ' peut vous déposer (score ' || NEW.match_score || '%)';
  
  -- Match accepté → notifier l'autre partie
  ELSIF NEW.status = 'accepted' AND OLD.status = 'proposed' THEN
    _target_user := CASE WHEN NEW.driver_id = OLD.driver_id THEN NEW.passenger_id ELSE NEW.driver_id END;
    _title := '✅ Match accepté !';
    _body := 'Vous pouvez maintenant coordonner le trajet';
  
  -- Trajet démarré → notifier le passager
  ELSIF NEW.status = 'in_transit' AND OLD.status = 'accepted' THEN
    _target_user := NEW.passenger_id;
    _title := '🚗 Trajet démarré !';
    _body := _driver_name || ' est en route pour vous récupérer';
  
  -- Trajet terminé → notifier les deux
  ELSIF NEW.status = 'completed' THEN
    _target_user := NEW.passenger_id;
    _title := '🏁 Trajet terminé !';
    _body := 'N''oubliez pas de noter votre expérience';
    -- Aussi notifier le conducteur
    INSERT INTO planning_notifications (user_id, type, title, body, data)
    VALUES (NEW.driver_id, 'ride_completed', _title, 'N''oubliez pas de noter ' || _passenger_name, 
            jsonb_build_object('match_id', NEW.id));
  
  -- Annulé → notifier l'autre partie
  ELSIF NEW.status = 'cancelled' THEN
    _target_user := CASE WHEN NEW.driver_id != NEW.passenger_id THEN
      CASE WHEN NEW.driver_id = auth.uid() THEN NEW.passenger_id ELSE NEW.driver_id END
      ELSE NEW.driver_id END;
    _title := '❌ Trajet annulé';
    _body := 'Le trajet a été annulé';
  
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO planning_notifications (user_id, type, title, body, data)
  VALUES (_target_user, 'ride_' || NEW.status, _title, _body, 
          jsonb_build_object('match_id', NEW.id));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ride_match ON ride_matches;
CREATE TRIGGER trg_notify_ride_match
  AFTER INSERT OR UPDATE OF status ON ride_matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_ride_match_change();


-- Trigger: notifier sur nouveau message
CREATE OR REPLACE FUNCTION notify_on_ride_message()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _sender_name TEXT;
  _other_user UUID;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, 'Quelqu''un') INTO _sender_name 
    FROM profiles WHERE id = NEW.sender_id;

  -- Trouver l'autre partie du match
  SELECT CASE 
    WHEN driver_id = NEW.sender_id THEN passenger_id 
    ELSE driver_id 
  END INTO _other_user
  FROM ride_matches WHERE id = NEW.match_id;

  IF _other_user IS NOT NULL THEN
    INSERT INTO planning_notifications (user_id, type, title, body, data)
    VALUES (_other_user, 'new_message', '💬 ' || _sender_name, 
            LEFT(NEW.content, 100),
            jsonb_build_object('match_id', NEW.match_id, 'message_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ride_message ON ride_messages;
CREATE TRIGGER trg_notify_ride_message
  AFTER INSERT ON ride_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_ride_message();


-- =============================================================================
-- 4. ACTIVER REALTIME SUR planning_notifications
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'planning_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE planning_notifications;
  END IF;
END;
$$;


-- =============================================================================
-- 5. METTRE À JOUR LA VUE active_drivers_on_road (exclure offres en pause)
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
INNER JOIN ride_offers ro ON ro.mission_id = mtl.mission_id 
  AND ro.status IN ('active', 'en_route')  -- exclut 'paused'
WHERE mtl.is_active = true
  AND m.status = 'in_progress'
ORDER BY mtl.last_update DESC;


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Correctifs P2+P3 appliqués :';
  RAISE NOTICE '  🔧 CHECK constraints étendus: in_transit, cancelled, paused';
  RAISE NOTICE '  🔧 handle_ride_match_status_change: gère in_transit + cancelled depuis accepted/in_transit';
  RAISE NOTICE '  🔧 notify_on_ride_match_change: notifications V2 sur ride_matches';
  RAISE NOTICE '  🔧 notify_on_ride_message: notifications sur nouveaux messages';
  RAISE NOTICE '  🔧 planning_notifications: table + RLS + Realtime';
  RAISE NOTICE '  🔧 active_drivers_on_road: exclut les offres en pause';
END;
$$;
