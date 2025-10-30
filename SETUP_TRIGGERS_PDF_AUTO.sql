-- ============================================
-- TRIGGERS AUTO-GÉNÉRATION PDF
-- ============================================

-- Extension nécessaire pour http requests
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- 1. FONCTION TRIGGER POUR AUTO-GÉNÉRATION PDF
-- ============================================

CREATE OR REPLACE FUNCTION trigger_pdf_generation()
RETURNS TRIGGER AS $$
DECLARE
  v_complete BOOLEAN;
  v_function_url TEXT;
BEGIN
  -- Vérifier si l'inspection est complète
  v_complete := is_inspection_complete(NEW.id);
  
  -- Si complète et PDF pas encore généré
  IF v_complete AND (NEW.pdf_generated IS NULL OR NEW.pdf_generated = FALSE) THEN
    
    -- URL de l'Edge Function
    v_function_url := current_setting('app.supabase_function_url', true) || '/generate-inspection-pdf';
    
    -- Appeler l'Edge Function de manière asynchrone
    -- Note: pg_net.http_post est non-bloquant
    PERFORM net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := jsonb_build_object(
        'inspectionId', NEW.id
      )
    );
    
    RAISE NOTICE 'PDF generation triggered for inspection %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. TRIGGER SUR INSERT/UPDATE INSPECTIONS
-- ============================================

DROP TRIGGER IF EXISTS auto_generate_pdf_on_complete ON vehicle_inspections;

CREATE TRIGGER auto_generate_pdf_on_complete
AFTER INSERT OR UPDATE OF client_signature, driver_signature
ON vehicle_inspections
FOR EACH ROW
WHEN (NEW.client_signature IS NOT NULL AND NEW.driver_signature IS NOT NULL)
EXECUTE FUNCTION trigger_pdf_generation();

COMMENT ON TRIGGER auto_generate_pdf_on_complete ON vehicle_inspections 
IS 'Déclenche automatiquement la génération PDF quand inspection complète';

-- ============================================
-- 3. FONCTION POUR FORCER REGÉNÉRATION MANUELLE
-- ============================================

CREATE OR REPLACE FUNCTION regenerate_inspection_pdf(inspection_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_function_url TEXT;
  v_response jsonb;
BEGIN
  -- URL de l'Edge Function
  v_function_url := current_setting('app.supabase_function_url', true) || '/generate-inspection-pdf';
  
  -- Appeler l'Edge Function
  v_response := net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object(
      'inspectionId', inspection_id
    )
  );
  
  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION regenerate_inspection_pdf 
IS 'Force la regénération du PDF pour une inspection donnée';

-- ============================================
-- 4. FONCTION POUR NETTOYER ANCIENS PDFs
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_pdfs(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Supprimer les PDFs de plus de X jours et jamais téléchargés
  WITH deleted AS (
    DELETE FROM inspection_pdfs
    WHERE generated_at < NOW() - (days_old || ' days')::INTERVAL
    AND last_downloaded_at IS NULL
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % old PDFs', v_deleted_count;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_pdfs 
IS 'Nettoie les PDFs non téléchargés de plus de X jours';

-- ============================================
-- 5. CONFIGURATION SETTINGS
-- ============================================

-- Ces settings doivent être définis dans votre instance Supabase
-- Via Dashboard → Settings → API ou variables d'environnement

-- Exemple de configuration (à adapter):
/*
ALTER DATABASE postgres SET app.supabase_function_url = 'https://your-project.supabase.co/functions/v1';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';
*/

-- ============================================
-- 6. VÉRIFICATION
-- ============================================

SELECT 
  '✅ Trigger: ' || trigger_name as status,
  event_manipulation as event_type,
  'ON ' || event_object_table as on_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'auto_generate_pdf_on_complete';

-- Tester la fonction de vérification de complétude
SELECT 
  '✅ Test function is_inspection_complete' as status,
  CASE 
    WHEN is_inspection_complete('00000000-0000-0000-0000-000000000000') IS NOT NULL 
    THEN 'Function exists ✅'
    ELSE 'Function missing ❌'
  END as result;
