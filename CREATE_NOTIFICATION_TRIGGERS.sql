-- TRIGGERS POUR NOTIFICATIONS AUTOMATIQUES

-- =====================================================
-- 1. NOTIFICATION QUAND UNE MISSION EST ASSIGNÉE
-- =====================================================
CREATE OR REPLACE FUNCTION notify_mission_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_mission_reference TEXT;
  v_notification_data JSONB;
BEGIN
  -- Uniquement si assigned_to_user_id est défini
  IF NEW.assigned_to_user_id IS NOT NULL THEN
    -- Récupérer la référence de la mission
    SELECT reference INTO v_mission_reference FROM missions WHERE id = NEW.mission_id;
    
    -- Préparer les données
    v_notification_data = jsonb_build_object(
      'type', 'mission_assigned',
      'missionId', NEW.mission_id,
      'reference', v_mission_reference
    );
    
    -- Envoyer la notification
    PERFORM send_push_notification(
      NEW.assigned_to_user_id,
      'Nouvelle mission assignée 📋',
      'Mission ' || v_mission_reference || ' vous a été assignée',
      v_notification_data
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_mission_assigned ON mission_assignments;
CREATE TRIGGER trigger_notify_mission_assigned
  AFTER INSERT ON mission_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_mission_assigned();

-- =====================================================
-- 2. NOTIFICATION QUAND UNE RÉSERVATION EST CONFIRMÉE/REJETÉE
-- =====================================================
CREATE OR REPLACE FUNCTION notify_booking_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_trip RECORD;
  v_title TEXT;
  v_body TEXT;
  v_notification_data JSONB;
BEGIN
  -- Uniquement si le statut change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Récupérer les infos du trajet
    SELECT departure_city, arrival_city INTO v_trip
    FROM carpooling_trips
    WHERE id = NEW.trip_id;
    
    -- Préparer le message selon le statut
    IF NEW.status = 'confirmed' THEN
      v_title = 'Réservation confirmée ✅';
      v_body = 'Votre réservation pour ' || v_trip.departure_city || ' → ' || v_trip.arrival_city || ' est confirmée !';
    ELSIF NEW.status = 'rejected' THEN
      v_title = 'Réservation refusée ❌';
      v_body = 'Votre demande pour ' || v_trip.departure_city || ' → ' || v_trip.arrival_city || ' a été refusée';
    ELSE
      RETURN NEW; -- Pas de notification pour les autres statuts
    END IF;
    
    -- Préparer les données
    v_notification_data = jsonb_build_object(
      'type', 'booking_' || NEW.status,
      'bookingId', NEW.id,
      'tripId', NEW.trip_id
    );
    
    -- Envoyer la notification au passager
    PERFORM send_push_notification(
      NEW.passenger_id,
      v_title,
      v_body,
      v_notification_data
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_booking_status_changed ON carpooling_bookings;
CREATE TRIGGER trigger_notify_booking_status_changed
  AFTER UPDATE ON carpooling_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_status_changed();

-- =====================================================
-- 3. NOTIFICATION QUAND UNE NOUVELLE RÉSERVATION EST FAITE
-- =====================================================
CREATE OR REPLACE FUNCTION notify_new_booking_request()
RETURNS TRIGGER AS $$
DECLARE
  v_trip RECORD;
  v_passenger_name TEXT;
  v_notification_data JSONB;
BEGIN
  -- Récupérer les infos du trajet et du conducteur
  SELECT t.driver_id, t.departure_city, t.arrival_city INTO v_trip
  FROM carpooling_trips t
  WHERE t.id = NEW.trip_id;
  
  -- Récupérer le nom du passager
  SELECT full_name INTO v_passenger_name
  FROM profiles
  WHERE id = NEW.passenger_id;
  
  -- Préparer les données
  v_notification_data = jsonb_build_object(
    'type', 'trip_booking_request',
    'bookingId', NEW.id,
    'tripId', NEW.trip_id
  );
  
  -- Envoyer la notification au conducteur
  PERFORM send_push_notification(
    v_trip.driver_id,
    'Nouvelle demande de réservation 🚗',
    v_passenger_name || ' souhaite réserver ' || NEW.seats || ' place(s) pour ' || 
    v_trip.departure_city || ' → ' || v_trip.arrival_city,
    v_notification_data
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_booking_request ON carpooling_bookings;
CREATE TRIGGER trigger_notify_new_booking_request
  AFTER INSERT ON carpooling_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking_request();

-- =====================================================
-- 4. NOTIFICATION POUR NOUVEAUX MESSAGES
-- =====================================================
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_trip RECORD;
  v_notification_data JSONB;
BEGIN
  -- Récupérer le nom de l'expéditeur
  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;
  
  -- Récupérer les infos du trajet
  SELECT departure_city, arrival_city INTO v_trip
  FROM carpooling_trips
  WHERE id = NEW.trip_id;
  
  -- Préparer les données
  v_notification_data = jsonb_build_object(
    'type', 'message_received',
    'tripId', NEW.trip_id,
    'senderId', NEW.sender_id
  );
  
  -- Envoyer la notification au destinataire
  PERFORM send_push_notification(
    NEW.receiver_id,
    'Nouveau message 💬',
    v_sender_name || ': ' || LEFT(NEW.content, 50) || 
    CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
    v_notification_data
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON carpooling_messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON carpooling_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- =====================================================
-- 5. NOTIFICATION QUAND STATUT DE MISSION CHANGE
-- =====================================================
CREATE OR REPLACE FUNCTION notify_mission_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_assigned_user_id UUID;
  v_status_text TEXT;
  v_notification_data JSONB;
BEGIN
  -- Uniquement si le statut change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Récupérer l'utilisateur assigné
    SELECT assigned_to_user_id INTO v_assigned_user_id
    FROM mission_assignments
    WHERE mission_id = NEW.id
    LIMIT 1;
    
    -- Si aucun utilisateur assigné, pas de notification
    IF v_assigned_user_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Texte selon le statut
    CASE NEW.status
      WHEN 'completed' THEN v_status_text = 'terminée ✅';
      WHEN 'cancelled' THEN v_status_text = 'annulée ❌';
      WHEN 'in_progress' THEN v_status_text = 'en cours 🚀';
      ELSE v_status_text = 'mise à jour 📝';
    END CASE;
    
    -- Préparer les données
    v_notification_data = jsonb_build_object(
      'type', 'mission_status_changed',
      'missionId', NEW.id,
      'status', NEW.status
    );
    
    -- Envoyer la notification
    PERFORM send_push_notification(
      v_assigned_user_id,
      'Mission ' || v_status_text,
      'Mission ' || NEW.reference || ' : ' || v_status_text,
      v_notification_data
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_mission_status_changed ON missions;
CREATE TRIGGER trigger_notify_mission_status_changed
  AFTER UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION notify_mission_status_changed();

-- Grant permissions
GRANT EXECUTE ON FUNCTION notify_mission_assigned TO authenticated;
GRANT EXECUTE ON FUNCTION notify_booking_status_changed TO authenticated;
GRANT EXECUTE ON FUNCTION notify_new_booking_request TO authenticated;
GRANT EXECUTE ON FUNCTION notify_new_message TO authenticated;
GRANT EXECUTE ON FUNCTION notify_mission_status_changed TO authenticated;

COMMENT ON FUNCTION notify_mission_assigned IS 'Envoie une notification quand une mission est assignée';
COMMENT ON FUNCTION notify_booking_status_changed IS 'Envoie une notification quand une réservation change de statut';
COMMENT ON FUNCTION notify_new_booking_request IS 'Envoie une notification au conducteur pour nouvelle réservation';
COMMENT ON FUNCTION notify_new_message IS 'Envoie une notification pour nouveau message';
COMMENT ON FUNCTION notify_mission_status_changed IS 'Envoie une notification quand le statut d''une mission change';
