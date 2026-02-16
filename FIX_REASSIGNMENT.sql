-- 🔥 FIX: Permettre de réassigner une mission à un autre chauffeur

-- Supprimer l'ancien trigger et fonction
DROP TRIGGER IF EXISTS enforce_assignment_rules ON mission_assignments;
DROP FUNCTION IF EXISTS check_assignment_rules();

-- Créer une nouvelle fonction qui permet la réassignation
CREATE OR REPLACE FUNCTION check_assignment_rules()
RETURNS TRIGGER AS $$
DECLARE
  existing_assignment RECORD;
BEGIN
  -- 1. VÉRIFIER LES DOUBLONS (INSERT uniquement)
  -- Permettre de réassigner en UPDATE, mais bloquer les doublons en INSERT
  IF (TG_OP = 'INSERT') THEN
    -- Vérifier si la mission est déjà assignée à quelqu'un
    SELECT * INTO existing_assignment
    FROM mission_assignments
    WHERE mission_id = NEW.mission_id
    AND status NOT IN ('cancelled', 'completed');
    
    IF FOUND THEN
      -- ✅ CHANGEMENT: Annuler automatiquement l'ancienne assignation
      UPDATE mission_assignments 
      SET status = 'cancelled', 
          notes = COALESCE(notes || ' | ', '') || '❌ Annulée automatiquement - Réassignée à un autre chauffeur le ' || NOW()::TEXT
      WHERE id = existing_assignment.id;
      
      RAISE NOTICE '✅ Ancienne assignation annulée automatiquement. Mission réassignée.';
    END IF;
  END IF;
  
  -- 2. CHANGEMENT D'ASSIGNÉ (UPDATE) - Plus souple
  IF (TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
    -- Permettre le changement sauf si la mission est complétée
    IF OLD.status = 'completed' THEN
      RAISE EXCEPTION '❌ Impossible de changer l''assigné : la mission est déjà terminée !'
        USING HINT = 'Une mission complétée ne peut plus être réassignée.';
    END IF;
    
    -- Ajouter une note dans l'historique
    NEW.notes := COALESCE(NEW.notes || ' | ', '') || 
                 '🔄 Réassigné le ' || NOW()::TEXT;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
CREATE TRIGGER enforce_assignment_rules
  BEFORE INSERT OR UPDATE ON mission_assignments
  FOR EACH ROW
  EXECUTE FUNCTION check_assignment_rules();

-- Vérifier que c'est bien créé
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'mission_assignments'
AND trigger_name = 'enforce_assignment_rules';
