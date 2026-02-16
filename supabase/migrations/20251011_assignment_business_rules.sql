-- ============================================
-- RÈGLES MÉTIER ASSIGNATIONS
-- Date : 11 octobre 2025
-- Objectif : 
--   1. Empêcher les doublons (une mission = un seul assigné à la fois)
--   2. Permettre de changer l'assigné seulement si mission pas en cours
-- ============================================

-- ============================================
-- FONCTION : Vérifier les règles d'assignation
-- ============================================

CREATE OR REPLACE FUNCTION check_assignment_rules()
RETURNS TRIGGER AS $$
DECLARE
  existing_assignment RECORD;
  mission_current_status TEXT;
BEGIN
  -- 1. VÉRIFIER LES DOUBLONS (INSERT uniquement)
  IF (TG_OP = 'INSERT') THEN
    -- Vérifier si la mission est déjà assignée à quelqu'un
    SELECT * INTO existing_assignment
    FROM mission_assignments
    WHERE mission_id = NEW.mission_id
    AND status NOT IN ('cancelled');
    
    IF FOUND THEN
      RAISE EXCEPTION '⚠️ Cette mission est déjà assignée à un contact. Veuillez d''abord annuler l''assignation existante.'
        USING HINT = 'Mission ID: ' || NEW.mission_id;
    END IF;
  END IF;
  
  -- 2. VÉRIFIER LE CHANGEMENT D'ASSIGNÉ (UPDATE uniquement)
  IF (TG_OP = 'UPDATE' AND OLD.contact_id != NEW.contact_id) THEN
    -- Vérifier le statut actuel de l'assignation
    IF OLD.status IN ('in_progress', 'completed') THEN
      RAISE EXCEPTION '❌ Impossible de changer l''assigné : la mission est déjà % !', OLD.status
        USING HINT = 'Vous pouvez seulement modifier les missions avec statut "assigned" ou "cancelled".';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER : Appliquer les règles avant INSERT/UPDATE
-- ============================================

DROP TRIGGER IF EXISTS enforce_assignment_rules ON mission_assignments;

CREATE TRIGGER enforce_assignment_rules
  BEFORE INSERT OR UPDATE ON mission_assignments
  FOR EACH ROW
  EXECUTE FUNCTION check_assignment_rules();

-- ============================================
-- VÉRIFICATIONS
-- ============================================

SELECT 'Règles métier activées : ' as message,
       '✅ Pas de doublons autorisés' as regle_1,
       '✅ Changement assigné bloqué si en cours' as regle_2;

-- Tester les triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'mission_assignments'
ORDER BY trigger_name;
