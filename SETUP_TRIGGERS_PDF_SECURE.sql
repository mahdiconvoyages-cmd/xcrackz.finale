-- ============================================
-- CONFIGURATION SÉCURISÉE SANS SETTINGS DB
-- ============================================
-- Solution: utiliser un secret interne au lieu de stocker
-- la Service Role Key dans la base de données

-- ============================================
-- 1. FONCTION TRIGGER SIMPLIFIÉE (sans settings DB)
-- ============================================

CREATE OR REPLACE FUNCTION trigger_pdf_generation()
RETURNS TRIGGER AS $$
DECLARE
  v_complete BOOLEAN;
  v_function_url TEXT;
  v_internal_secret TEXT;
BEGIN
  -- Vérifier si l'inspection est complète
  v_complete := is_inspection_complete(NEW.id);

  -- Si complète et PDF pas encore généré
  IF v_complete AND (NEW.pdf_generated IS NULL OR NEW.pdf_generated = FALSE) THEN

    -- URL hardcodée (pas de setting DB requis)
    v_function_url := 'https://bfrkthzovwpjrvqktdjn.supabase.co/functions/v1/generate-inspection-pdf';
    
    -- Secret interne (tu peux le changer, mais garde-le identique à celui posé via CLI)
    v_internal_secret := 'finality_pdf_internal_2024';

    -- Appeler l'Edge Function de manière asynchrone avec le secret
    PERFORM net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Secret', v_internal_secret
      ),
      body := jsonb_build_object(
        'inspectionId', NEW.id
      )
    );

    RAISE NOTICE 'PDF generation triggered for inspection %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permissions minimales
REVOKE ALL ON FUNCTION trigger_pdf_generation() FROM PUBLIC;

-- ============================================
-- 2. FONCTION MANUELLE RÉGÉNÉRATION
-- ============================================

DROP FUNCTION IF EXISTS regenerate_inspection_pdf(UUID);

CREATE OR REPLACE FUNCTION regenerate_inspection_pdf(p_inspection_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_function_url TEXT;
  v_internal_secret TEXT;
  v_response jsonb;
BEGIN
  v_function_url := 'https://bfrkthzovwpjrvqktdjn.supabase.co/functions/v1/generate-inspection-pdf';
  v_internal_secret := 'finality_pdf_internal_2024';
  
  -- Appeler l'Edge Function
  v_response := net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', v_internal_secret
    ),
    body := jsonb_build_object(
      'inspectionId', p_inspection_id
    )
  );
  
  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION regenerate_inspection_pdf(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION regenerate_inspection_pdf(UUID) TO authenticated;

-- ============================================
-- 3. RECRÉER LE TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS auto_generate_pdf_on_complete ON vehicle_inspections;

CREATE TRIGGER auto_generate_pdf_on_complete
AFTER INSERT OR UPDATE OF client_signature, driver_signature
ON vehicle_inspections
FOR EACH ROW
WHEN (NEW.client_signature IS NOT NULL AND NEW.driver_signature IS NOT NULL)
EXECUTE FUNCTION trigger_pdf_generation();

-- ============================================
-- 4. VÉRIFICATION
-- ============================================

SELECT 
  '✅ Trigger recreated' as status,
  trigger_name,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'auto_generate_pdf_on_complete';

SELECT '✅ Function regenerate_inspection_pdf available' as status;
