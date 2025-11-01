-- ============================================
-- PDF COMBINÉ DÉPART + ARRIVÉE
-- ============================================
-- Génère UN SEUL PDF avec les 2 inspections quand elles sont complètes

-- 1. Fonction pour vérifier si une mission a les 2 inspections complètes
CREATE OR REPLACE FUNCTION mission_has_both_inspections(p_mission_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_departure_count INT;
  v_arrival_count INT;
BEGIN
  -- Compter les inspections départ complètes
  SELECT COUNT(*) INTO v_departure_count
  FROM vehicle_inspections
  WHERE mission_id = p_mission_id
    AND inspection_type = 'departure'
    AND client_signature IS NOT NULL
    AND driver_signature IS NOT NULL;

  -- Compter les inspections arrivée complètes
  SELECT COUNT(*) INTO v_arrival_count
  FROM vehicle_inspections
  WHERE mission_id = p_mission_id
    AND inspection_type = 'arrival'
    AND client_signature IS NOT NULL
    AND driver_signature IS NOT NULL;

  RETURN (v_departure_count > 0 AND v_arrival_count > 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Fonction pour obtenir les IDs des 2 inspections d'une mission
CREATE OR REPLACE FUNCTION get_mission_inspection_ids(p_mission_id UUID)
RETURNS TABLE(departure_id UUID, arrival_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT id FROM vehicle_inspections 
     WHERE mission_id = p_mission_id AND inspection_type = 'departure' 
     ORDER BY created_at DESC LIMIT 1) as departure_id,
    (SELECT id FROM vehicle_inspections 
     WHERE mission_id = p_mission_id AND inspection_type = 'arrival' 
     ORDER BY created_at DESC LIMIT 1) as arrival_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Nouveau trigger qui génère le PDF combiné
CREATE OR REPLACE FUNCTION trigger_combined_pdf_generation()
RETURNS TRIGGER AS $$
DECLARE
  v_complete BOOLEAN;
  v_both_complete BOOLEAN;
  v_function_url TEXT;
  v_internal_secret TEXT;
  v_mission_id UUID;
  v_departure_id UUID;
  v_arrival_id UUID;
  v_pdf_already_exists BOOLEAN;
BEGIN
  -- Vérifier si cette inspection est complète
  v_complete := is_inspection_complete(NEW.id);
  
  IF NOT v_complete THEN
    RETURN NEW;
  END IF;

  v_mission_id := NEW.mission_id;

  -- Vérifier si la mission a les 2 inspections complètes
  v_both_complete := mission_has_both_inspections(v_mission_id);

  IF NOT v_both_complete THEN
    RAISE NOTICE 'Mission % : une seule inspection complète, attente de la seconde', v_mission_id;
    RETURN NEW;
  END IF;

  -- Obtenir les IDs des 2 inspections
  SELECT departure_id, arrival_id INTO v_departure_id, v_arrival_id
  FROM get_mission_inspection_ids(v_mission_id);

  -- Vérifier si un PDF existe déjà pour cette mission
  SELECT EXISTS(
    SELECT 1 FROM inspection_pdfs 
    WHERE mission_id = v_mission_id
  ) INTO v_pdf_already_exists;

  IF v_pdf_already_exists THEN
    RAISE NOTICE 'PDF déjà généré pour mission %', v_mission_id;
    RETURN NEW;
  END IF;

  -- Générer le PDF combiné
  v_function_url := 'https://bfrkthzovwpjrvqktdjn.supabase.co/functions/v1/generate-inspection-pdf';
  v_internal_secret := 'finality_pdf_internal_2024';

  PERFORM net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', v_internal_secret
    ),
    body := jsonb_build_object(
      'missionId', v_mission_id,
      'departureId', v_departure_id,
      'arrivalId', v_arrival_id,
      'combined', true
    )
  );

  RAISE NOTICE 'PDF combiné déclenché pour mission % (départ: %, arrivée: %)', v_mission_id, v_departure_id, v_arrival_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION trigger_combined_pdf_generation() FROM PUBLIC;

-- 4. Remplacer l'ancien trigger
DROP TRIGGER IF EXISTS auto_generate_pdf_on_complete ON vehicle_inspections;

CREATE TRIGGER auto_generate_pdf_on_complete
AFTER INSERT OR UPDATE OF client_signature, driver_signature
ON vehicle_inspections
FOR EACH ROW
WHEN (NEW.client_signature IS NOT NULL AND NEW.driver_signature IS NOT NULL)
EXECUTE FUNCTION trigger_combined_pdf_generation();

-- 5. Fonction RPC pour régénération manuelle (version combinée)
DROP FUNCTION IF EXISTS regenerate_combined_pdf(UUID);

CREATE OR REPLACE FUNCTION regenerate_combined_pdf(p_mission_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_function_url TEXT;
  v_internal_secret TEXT;
  v_departure_id UUID;
  v_arrival_id UUID;
  v_response jsonb;
BEGIN
  -- Obtenir les IDs des inspections
  SELECT departure_id, arrival_id INTO v_departure_id, v_arrival_id
  FROM get_mission_inspection_ids(p_mission_id);

  IF v_departure_id IS NULL OR v_arrival_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Mission incomplète : il manque une inspection (départ ou arrivée)'
    );
  END IF;

  v_function_url := 'https://bfrkthzovwpjrvqktdjn.supabase.co/functions/v1/generate-inspection-pdf';
  v_internal_secret := 'finality_pdf_internal_2024';
  
  v_response := net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', v_internal_secret
    ),
    body := jsonb_build_object(
      'missionId', p_mission_id,
      'departureId', v_departure_id,
      'arrivalId', v_arrival_id,
      'combined', true
    )
  );
  
  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION regenerate_combined_pdf(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION regenerate_combined_pdf(UUID) TO authenticated;

-- 6. Modifier la table inspection_pdfs pour stocker le mission_id
ALTER TABLE inspection_pdfs 
ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id);

CREATE INDEX IF NOT EXISTS idx_inspection_pdfs_mission_id ON inspection_pdfs(mission_id);

-- 7. Vérification
SELECT '✅ Trigger PDF combiné créé' as status;
SELECT '✅ Fonction regenerate_combined_pdf disponible' as status;
