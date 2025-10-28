-- ============================================
-- FIX: Corriger les fonctions de notification
-- ============================================

-- 1. Vérifier la structure de mission_assignments
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mission_assignments'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Recréer notify_mission_assigned avec les bonnes colonnes
CREATE OR REPLACE FUNCTION notify_mission_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mission_reference TEXT;
  v_notification_data JSONB;
  v_assigned_user_id UUID;
BEGIN
  -- Déterminer l'utilisateur assigné (selon la structure de mission_assignments)
  -- Option 1: Si mission_assignments a une colonne user_id
  v_assigned_user_id := NEW.user_id;
  
  -- Uniquement si un utilisateur est assigné
  IF v_assigned_user_id IS NOT NULL THEN
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
      v_assigned_user_id,
      'Nouvelle mission assignée 📋',
      'Mission ' || v_mission_reference || ' vous a été assignée',
      v_notification_data
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Recréer notify_mission_status_changed
CREATE OR REPLACE FUNCTION notify_mission_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assigned_user_id UUID;
  v_status_text TEXT;
  v_notification_data JSONB;
BEGIN
  -- Uniquement si le statut change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Récupérer l'utilisateur assigné depuis la table missions
    v_assigned_user_id := NEW.assigned_user_id;  -- ✅ Utiliser assigned_user_id
    
    -- Si aucun utilisateur assigné, pas de notification
    IF v_assigned_user_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Texte selon le statut
    CASE NEW.status
      WHEN 'completed' THEN v_status_text := 'terminée ✅';
      WHEN 'cancelled' THEN v_status_text := 'annulée ❌';
      WHEN 'in_progress' THEN v_status_text := 'en cours 🚀';
      ELSE v_status_text := 'mise à jour 📝';
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
$$;

-- 4. Reload PostgREST
NOTIFY pgrst, 'reload schema';
