-- ============================================================================
-- SYSTÈME D'EXPIRATION AUTOMATIQUE DES RAPPORTS D'INSPECTION
-- Les rapports expirent 6 mois après la fin de la mission
-- L'utilisateur peut aussi supprimer manuellement son rapport
-- ============================================================================

-- =============================================
-- 1. TRIGGER: Auto-set expires_at quand une mission passe en "completed"
-- Met expires_at = NOW() + 6 mois sur tous les shares de cette mission
-- =============================================
CREATE OR REPLACE FUNCTION set_report_expiration_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand une mission passe en "completed"
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.inspection_report_shares
    SET expires_at = NOW() + INTERVAL '6 months'
    WHERE mission_id = NEW.id
      AND is_active = TRUE
      AND expires_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trg_set_report_expiration ON public.missions;

-- Créer le trigger
CREATE TRIGGER trg_set_report_expiration
  AFTER UPDATE ON public.missions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION set_report_expiration_on_completion();

-- =============================================
-- 2. Mettre à jour les shares existants des missions déjà complétées
-- Pour les missions complétées SANS expires_at, on met 6 mois depuis updated_at
-- =============================================
UPDATE public.inspection_report_shares irs
SET expires_at = COALESCE(m.updated_at, m.created_at) + INTERVAL '6 months'
FROM public.missions m
WHERE irs.mission_id = m.id
  AND m.status = 'completed'
  AND irs.is_active = TRUE
  AND irs.expires_at IS NULL;

-- =============================================
-- 3. Mettre expires_at aussi lors de la CRÉATION d'un share
--    si la mission est déjà completed
-- =============================================
-- On modifie la fonction create_or_get_inspection_share pour inclure expires_at
DROP FUNCTION IF EXISTS create_or_get_inspection_share(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION create_or_get_inspection_share(
  p_mission_id UUID,
  p_user_id UUID,
  p_report_type TEXT DEFAULT 'complete'
)
RETURNS TABLE (
  share_url TEXT,
  share_token TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_token TEXT;
  v_existing_record RECORD;
  v_mission_status TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  -- Chercher un partage existant actif
  SELECT * INTO v_existing_record
  FROM public.inspection_report_shares
  WHERE mission_id = p_mission_id
    AND report_type = p_report_type
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT 
      'https://www.xcrackz.com/rapport-inspection/' || v_existing_record.share_token AS share_url,
      v_existing_record.share_token,
      v_existing_record.created_at;
    RETURN;
  END IF;

  -- Vérifier si la mission est complétée pour auto-set expires_at
  SELECT status INTO v_mission_status FROM public.missions WHERE id = p_mission_id;
  IF v_mission_status = 'completed' THEN
    v_expires := NOW() + INTERVAL '6 months';
  ELSE
    v_expires := NULL;
  END IF;

  -- Générer un token unique
  v_token := encode(gen_random_bytes(16), 'base64');
  v_token := replace(replace(replace(v_token, '/', ''), '+', ''), '=', '');

  -- Insérer le nouveau partage avec expiration
  INSERT INTO public.inspection_report_shares (mission_id, user_id, share_token, report_type, expires_at)
  VALUES (p_mission_id, p_user_id, v_token, p_report_type, v_expires);

  RETURN QUERY SELECT 
    'https://www.xcrackz.com/rapport-inspection/' || v_token AS share_url,
    v_token,
    NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_or_get_inspection_share(UUID, UUID, TEXT) TO authenticated;

-- =============================================
-- 4. Fonction pour supprimer manuellement un rapport (désactiver)
-- L'utilisateur peut appeler cette RPC pour désactiver son rapport
-- =============================================
CREATE OR REPLACE FUNCTION delete_inspection_report(
  p_mission_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Vérifier que l'utilisateur est le propriétaire de la mission
  IF NOT EXISTS (
    SELECT 1 FROM public.missions 
    WHERE id = p_mission_id AND user_id = p_user_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Désactiver tous les shares de cette mission
  UPDATE public.inspection_report_shares
  SET is_active = FALSE
  WHERE mission_id = p_mission_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_inspection_report(UUID, UUID) TO authenticated;

-- =============================================
-- 5. Fonction de nettoyage des photos expirées (à lancer périodiquement)
-- Désactive les shares expirés automatiquement
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.inspection_report_shares
  SET is_active = FALSE
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = TRUE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. Cron job pour nettoyer les rapports expirés (quotidien)
-- Nécessite l'extension pg_cron (activée par défaut sur Supabase Pro)
-- =============================================
-- Activer pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer le job s'il existe déjà
SELECT cron.unschedule('cleanup-expired-reports') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-reports'
);

-- Planifier le nettoyage tous les jours à 3h du matin
SELECT cron.schedule(
  'cleanup-expired-reports',
  '0 3 * * *',
  $$SELECT cleanup_expired_reports()$$
);

-- =============================================
-- 7. Vue pour vérifier les rapports et leur expiration
-- =============================================
-- SELECT 
--   irs.mission_id,
--   irs.share_token,
--   irs.is_active,
--   irs.expires_at,
--   irs.created_at,
--   m.status as mission_status,
--   m.reference
-- FROM inspection_report_shares irs
-- JOIN missions m ON m.id = irs.mission_id
-- ORDER BY irs.created_at DESC
-- LIMIT 20;
