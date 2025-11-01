-- ============================================
-- FIX FONCTION is_inspection_complete
-- ============================================
-- Résout l'ambiguïté du paramètre inspection_id

DROP FUNCTION IF EXISTS is_inspection_complete(UUID);

CREATE OR REPLACE FUNCTION is_inspection_complete(p_inspection_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_inspection RECORD;
  v_photo_count INTEGER;
  v_required_photos INTEGER := 4; -- Minimum requis
BEGIN
  -- Récupérer l'inspection (p_ pour paramètre)
  SELECT * INTO v_inspection
  FROM vehicle_inspections
  WHERE id = p_inspection_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier signatures
  IF v_inspection.client_signature IS NULL OR v_inspection.driver_signature IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Compter les photos
  SELECT COUNT(*) INTO v_photo_count
  FROM inspection_photos_v2
  WHERE inspection_id = p_inspection_id;
  
  -- Retourner true si assez de photos
  RETURN v_photo_count >= v_required_photos;
END;
$$;

-- ============================================
-- FIX FONCTION regenerate_inspection_pdf
-- ============================================

DROP FUNCTION IF EXISTS regenerate_inspection_pdf(UUID);

CREATE OR REPLACE FUNCTION regenerate_inspection_pdf(p_inspection_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_url TEXT;
  v_service_key TEXT;
  v_response jsonb;
BEGIN
  -- URL de l'Edge Function
  v_function_url := current_setting('app.supabase_function_url', true) || '/generate-inspection-pdf';
  v_service_key := current_setting('app.supabase_service_role_key', true);
  
  -- Appeler l'Edge Function
  SELECT content::jsonb INTO v_response
  FROM http((
    'POST',
    v_function_url,
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Bearer ' || v_service_key)
    ],
    'application/json',
    jsonb_build_object('inspectionId', p_inspection_id)::text
  ));
  
  RETURN v_response;
END;
$$;

-- ============================================
-- VÉRIFICATION
-- ============================================

SELECT 
  '✅ Fonctions corrigées' as status,
  proname as function_name,
  pg_get_function_identity_arguments(oid) as parameters
FROM pg_proc
WHERE proname IN ('is_inspection_complete', 'regenerate_inspection_pdf')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
