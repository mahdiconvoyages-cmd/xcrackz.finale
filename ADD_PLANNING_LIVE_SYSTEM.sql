-- ============================================================================
-- Migration: Planning Expiration, Live Location & Notification System
-- ============================================================================

-- ============================================================================
-- 1. Colonnes de localisation live dans profiles
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_permission TEXT DEFAULT 'none' 
  CHECK (location_permission IN ('none', 'while_in_use', 'always'));

-- ============================================================================
-- 2. Table de notifications push pour planning
-- ============================================================================
CREATE TABLE IF NOT EXISTS planning_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_match', 'match_accepted', 'match_declined', 'new_message', 'planning_expired')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planning_notifications_user ON planning_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_planning_notifications_unread ON planning_notifications(user_id) WHERE is_read = false;

ALTER TABLE planning_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON planning_notifications;
CREATE POLICY "Users can view own notifications" ON planning_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON planning_notifications;
CREATE POLICY "Users can update own notifications" ON planning_notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON planning_notifications;
CREATE POLICY "System can insert notifications" ON planning_notifications
  FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE planning_notifications;

-- ============================================================================
-- 3. Ajout colonnes ETA waypoints
-- ============================================================================
ALTER TABLE planning_waypoints ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMPTZ;
ALTER TABLE planning_waypoints ADD COLUMN IF NOT EXISTS eta_minutes INTEGER;

-- ============================================================================
-- 4. Ajout colonne expires_at sur convoy_plannings
-- ============================================================================
ALTER TABLE convoy_plannings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE convoy_plannings ADD COLUMN IF NOT EXISTS current_waypoint_index INTEGER DEFAULT 0;

-- Trigger: calculer expires_at automatiquement à la création/modification
CREATE OR REPLACE FUNCTION compute_planning_expires_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- expires_at = planning_date + end_time + flexibility_minutes
  NEW.expires_at := (NEW.planning_date + NEW.end_time) + 
    (COALESCE(NEW.flexibility_minutes, 30) * INTERVAL '1 minute');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_expires_at ON convoy_plannings;
CREATE TRIGGER trg_compute_expires_at
  BEFORE INSERT OR UPDATE OF planning_date, end_time, flexibility_minutes
  ON convoy_plannings
  FOR EACH ROW
  EXECUTE FUNCTION compute_planning_expires_at();

-- Remplir expires_at pour les plannings existants
UPDATE convoy_plannings 
SET expires_at = (planning_date + end_time) + (COALESCE(flexibility_minutes, 30) * INTERVAL '1 minute')
WHERE expires_at IS NULL;

-- ============================================================================
-- 5. Function: Vérifier la visibilité d'un planning selon la progression
-- Un planning est visible sur les villes restantes après expiration de l'origine
-- ============================================================================

CREATE OR REPLACE FUNCTION get_planning_visibility(p_planning_id UUID)
RETURNS TABLE (
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_expired BOOLEAN,
  is_active BOOLEAN,
  eta_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_planning RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_planning FROM convoy_plannings WHERE id = p_planning_id;
  IF v_planning IS NULL THEN RETURN; END IF;

  -- Origine
  RETURN QUERY SELECT 
    v_planning.origin_city,
    v_planning.origin_lat,
    v_planning.origin_lng,
    -- L'origine expire après start_time + flexibility
    (v_now > (v_planning.planning_date + v_planning.start_time) + 
      (COALESCE(v_planning.flexibility_minutes, 30) * INTERVAL '1 minute'))::BOOLEAN,
    (v_planning.status = 'published' AND v_now < v_planning.expires_at)::BOOLEAN,
    0;

  -- Waypoints (étapes intermédiaires = villes desservies sur le retour)
  RETURN QUERY SELECT 
    pw.city,
    pw.lat,
    pw.lng,
    -- Un waypoint expire après son estimated_arrival
    (pw.estimated_arrival IS NOT NULL AND v_now > pw.estimated_arrival)::BOOLEAN,
    -- Actif si pas expiré et planning pas fini
    (v_planning.status = 'published' AND 
     (pw.estimated_arrival IS NULL OR v_now <= pw.estimated_arrival) AND
     pw.sort_order >= v_planning.current_waypoint_index)::BOOLEAN,
    pw.eta_minutes;

  -- Destination
  RETURN QUERY SELECT 
    v_planning.destination_city,
    v_planning.destination_lat,
    v_planning.destination_lng,
    (v_now > v_planning.expires_at)::BOOLEAN,
    (v_planning.status = 'published' AND v_now < v_planning.expires_at)::BOOLEAN,
    EXTRACT(EPOCH FROM (v_planning.expires_at - (v_planning.planning_date + v_planning.start_time)))::INTEGER / 60;

  RETURN;
END;
$$;

-- ============================================================================
-- 6. Function: Calculer ETA vers chaque ville basé sur la position live
-- Vitesse moyenne estimée : 80 km/h
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_planning_eta(
  p_planning_id UUID,
  p_user_lat DOUBLE PRECISION,
  p_user_lng DOUBLE PRECISION
)
RETURNS TABLE (
  city TEXT,
  distance_km DOUBLE PRECISION,
  eta_minutes INTEGER,
  is_reached BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_earth_radius CONSTANT DOUBLE PRECISION := 6371;
  v_avg_speed_kmh CONSTANT DOUBLE PRECISION := 80;
  v_planning RECORD;
BEGIN
  SELECT * INTO v_planning FROM convoy_plannings WHERE id = p_planning_id;
  IF v_planning IS NULL THEN RETURN; END IF;

  -- Calcul pour chaque point du trajet
  RETURN QUERY
  WITH all_points AS (
    -- Origine
    SELECT v_planning.origin_city AS city, v_planning.origin_lat AS lat, v_planning.origin_lng AS lng, -1 AS sort_order
    UNION ALL
    -- Waypoints
    SELECT pw.city, pw.lat, pw.lng, pw.sort_order
    FROM planning_waypoints pw WHERE pw.planning_id = p_planning_id
    UNION ALL
    -- Destination
    SELECT v_planning.destination_city, v_planning.destination_lat, v_planning.destination_lng, 9999
  )
  SELECT 
    ap.city,
    -- Distance Haversine
    (v_earth_radius * 2 * asin(sqrt(
      sin(radians(ap.lat - p_user_lat) / 2) ^ 2 +
      cos(radians(p_user_lat)) * cos(radians(ap.lat)) *
      sin(radians(ap.lng - p_user_lng) / 2) ^ 2
    ))) AS distance_km,
    -- ETA en minutes (distance / vitesse * 60)
    ((v_earth_radius * 2 * asin(sqrt(
      sin(radians(ap.lat - p_user_lat) / 2) ^ 2 +
      cos(radians(p_user_lat)) * cos(radians(ap.lat)) *
      sin(radians(ap.lng - p_user_lng) / 2) ^ 2
    )) / v_avg_speed_kmh) * 60)::INTEGER AS eta_minutes,
    -- Considéré comme atteint si < 2km
    ((v_earth_radius * 2 * asin(sqrt(
      sin(radians(ap.lat - p_user_lat) / 2) ^ 2 +
      cos(radians(p_user_lat)) * cos(radians(ap.lat)) *
      sin(radians(ap.lng - p_user_lng) / 2) ^ 2
    ))) < 2)::BOOLEAN AS is_reached
  FROM all_points ap
  WHERE ap.lat IS NOT NULL AND ap.lng IS NOT NULL
  ORDER BY ap.sort_order;
END;
$$;

-- ============================================================================
-- 7. Trigger: Notifications automatiques sur nouveaux matchs
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_match_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Nouveau match trouvé
  IF TG_OP = 'INSERT' THEN
    -- Notifier user_b (celui qui reçoit la proposition)
    INSERT INTO planning_notifications (user_id, type, title, body, data) VALUES (
      NEW.user_b_id,
      'new_match',
      '🔄 Nouveau match trouvé !',
      'Un convoyeur a un trajet compatible avec le vôtre. Score: ' || NEW.match_score || '%',
      jsonb_build_object('match_id', NEW.id, 'match_score', NEW.match_score, 'match_type', NEW.match_type)
    );
  END IF;

  -- Match accepté ou décliné
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'accepted' THEN
      -- Notifier les deux parties
      INSERT INTO planning_notifications (user_id, type, title, body, data) VALUES 
      (
        CASE WHEN NEW.user_a_id = auth.uid() THEN NEW.user_b_id ELSE NEW.user_a_id END,
        'match_accepted',
        '✅ Match accepté !',
        'Votre proposition de trajet partagé a été acceptée. Ouvrez le chat pour coordonner.',
        jsonb_build_object('match_id', NEW.id)
      );
    ELSIF NEW.status = 'declined' THEN
      INSERT INTO planning_notifications (user_id, type, title, body, data) VALUES (
        CASE WHEN NEW.user_a_id = auth.uid() THEN NEW.user_b_id ELSE NEW.user_a_id END,
        'match_declined',
        'Match décliné',
        'Votre proposition de trajet a été déclinée.',
        jsonb_build_object('match_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_match_change ON planning_matches;
CREATE TRIGGER trg_notify_match_change
  AFTER INSERT OR UPDATE OF status ON planning_matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_match_change();

-- ============================================================================
-- 8. Trigger: Notification sur nouveau message
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match RECORD;
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  -- Récupérer le match
  SELECT * INTO v_match FROM planning_matches WHERE id = NEW.match_id;
  IF v_match IS NULL THEN RETURN NEW; END IF;

  -- Déterminer le destinataire (l'autre personne du match)
  v_recipient_id := CASE 
    WHEN v_match.user_a_id = NEW.sender_id THEN v_match.user_b_id 
    ELSE v_match.user_a_id 
  END;

  -- Nom de l'expéditeur
  SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO planning_notifications (user_id, type, title, body, data) VALUES (
    v_recipient_id,
    'new_message',
    '💬 ' || COALESCE(v_sender_name, 'Un convoyeur'),
    LEFT(NEW.content, 100),
    jsonb_build_object('match_id', NEW.match_id, 'message_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON planning_messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON planning_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();

-- ============================================================================
-- 9. Function: Mettre à jour la position live de l'utilisateur
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_location(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles SET 
    last_lat = p_lat,
    last_lng = p_lng,
    last_location_at = now()
  WHERE id = auth.uid();
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE planning_notifications IS 'Notifications push pour le réseau planning (matchs, messages, expirations)';
COMMENT ON FUNCTION compute_planning_expires_at IS 'Trigger: calcule expires_at = date + end_time + flexibility';
COMMENT ON FUNCTION get_planning_visibility IS 'Retourne la visibilité de chaque étape du planning (expirée ou active)';
COMMENT ON FUNCTION calculate_planning_eta IS 'Calcule l ETA vers chaque ville du planning basé sur la position GPS';
COMMENT ON FUNCTION update_user_location IS 'Met à jour la position live du convoyeur dans profiles';
COMMENT ON FUNCTION notify_on_match_change IS 'Trigger: crée une notification quand un match est créé/accepté/décliné';
COMMENT ON FUNCTION notify_on_new_message IS 'Trigger: crée une notification quand un message est envoyé dans un chat';
