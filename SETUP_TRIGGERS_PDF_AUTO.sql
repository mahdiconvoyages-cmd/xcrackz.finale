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
  v_base_url TEXT;
  v_service_key TEXT;
  v_function_url TEXT;
BEGIN
  -- Vérifier si l'inspection est complète
  v_complete := is_inspection_complete(NEW.id);

  -- Si complète et PDF pas encore généré
  IF v_complete AND (NEW.pdf_generated IS NULL OR NEW.pdf_generated = FALSE) THEN

    -- Récupération des settings (peuvent être NULL si non configurés)
    v_base_url   := NULLIF(current_setting('app.supabase_function_url', true), '');
    v_service_key := NULLIF(current_setting('app.supabase_service_role_key', true), '');

    -- Sécurité: si les settings ne sont pas configurés, on sort proprement
    IF v_base_url IS NULL OR v_service_key IS NULL THEN
      RAISE NOTICE 'PDF generation skipped: app.supabase_function_url or app.supabase_service_role_key not configured';
      RETURN NEW;
    END IF;

    -- URL de l'Edge Function
    v_function_url := v_base_url || '/generate-inspection-pdf';

    -- Appeler l'Edge Function de manière asynchrone
    -- Note: net.http_post (pg_net) est non-bloquant
    PERFORM net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
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

-- Permissions minimales: on évite l'appel direct par PUBLIC
REVOKE ALL ON FUNCTION trigger_pdf_generation() FROM PUBLIC;

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

-- Assurer la cohérence de la signature et éviter l'ambiguïté du nom de paramètre
DROP FUNCTION IF EXISTS regenerate_inspection_pdf(UUID);

CREATE OR REPLACE FUNCTION regenerate_inspection_pdf(p_inspection_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_base_url TEXT;
  v_service_key TEXT;
  v_function_url TEXT;
  v_response jsonb;
BEGIN
  -- Récupération des settings
  v_base_url    := NULLIF(current_setting('app.supabase_function_url', true), '');
  v_service_key := NULLIF(current_setting('app.supabase_service_role_key', true), '');

  IF v_base_url IS NULL OR v_service_key IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing app.supabase_function_url or app.supabase_service_role_key settings'
    );
  END IF;

  -- URL de l'Edge Function
  v_function_url := v_base_url || '/generate-inspection-pdf';
  
  -- Appeler l'Edge Function
  v_response := net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'inspectionId', p_inspection_id
    )
  );
  
  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION regenerate_inspection_pdf 
IS 'Force la regénération du PDF pour une inspection donnée';

-- Restreindre les permissions: pas d'exécution publique, mais autoriser les utilisateurs authentifiés
REVOKE ALL ON FUNCTION regenerate_inspection_pdf(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION regenerate_inspection_pdf(UUID) TO authenticated;

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

-- Vérifier que les settings sont configurés
SELECT 
  '🔧 app.supabase_function_url set' AS setting,
  COALESCE(NULLIF(current_setting('app.supabase_function_url', true), ''), 'NULL') AS value;

SELECT 
  '🔧 app.supabase_service_role_key set' AS setting,
  CASE WHEN NULLIF(current_setting('app.supabase_service_role_key', true), '') IS NULL THEN 'NULL' ELSE '***MASKED***' END AS value;
