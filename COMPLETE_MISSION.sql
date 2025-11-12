-- ================================================
-- RPC: complete_mission(p_mission_id uuid)
-- Objectif: Marquer une mission comme terminée en sécurité (contourner RLS)
-- - Met status='completed'
-- - Met completed_at=NOW() si la colonne existe
-- - Vérifie l'existence de la mission
-- ================================================

DROP FUNCTION IF EXISTS complete_mission(UUID);
-- Nouvelle version enrichie avec:
--  - Idempotence (ne refait pas l'update si déjà 'completed')
--  - Champs optionnels d'audit si disponibles: completed_at, completed_by, completed_via, completed_reason
--  - Paramètres pour forcer la source (p_completed_via) et raison (p_reason)
--  - Retourne la mission mise à jour dans le JSON
--  - SECURITY DEFINER pour contourner RLS en sécurité contrôlée
--  - completed_by utilise auth.uid() si colonne présente (et si l'appel est authentifié)
CREATE OR REPLACE FUNCTION complete_mission(
  p_mission_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_completed_via TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
  v_already_completed BOOLEAN := FALSE;
  has_completed_at BOOLEAN := FALSE;
  has_completed_by BOOLEAN := FALSE;
  has_completed_via BOOLEAN := FALSE;
  has_completed_reason BOOLEAN := FALSE;
  v_uid UUID;
  v_mission RECORD;
BEGIN
  -- Vérifier existence mission
  SELECT TRUE INTO v_exists FROM public.missions WHERE id = p_mission_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Mission introuvable');
  END IF;

  -- Déterminer si déjà complétée
  SELECT (status = 'completed') INTO v_already_completed FROM public.missions WHERE id = p_mission_id;

  -- Inspecter les colonnes existantes (évite les exceptions)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='missions' AND column_name='completed_at'
  ) INTO has_completed_at;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='missions' AND column_name='completed_by'
  ) INTO has_completed_by;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='missions' AND column_name='completed_via'
  ) INTO has_completed_via;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='missions' AND column_name='completed_reason'
  ) INTO has_completed_reason;

  -- Récupérer l'UID du caller si disponible (Supabase auth.uid())
  BEGIN
    v_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL; -- Si non disponible (appelle via service backend)
  END;

  -- Si déjà complétée: retourner directement (mais renvoyer mission courante)
  IF v_already_completed THEN
    SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id;
    RETURN jsonb_build_object(
      'ok', true,
      'alreadyCompleted', true,
      'mission', to_jsonb(v_mission)
    );
  END IF;

  -- Construire l'UPDATE dynamiquement selon colonnes
  -- Utilise EXECUTE pour injecter seulement ce qui existe
  DECLARE
    sql TEXT := 'UPDATE public.missions SET status = ''completed''';
  BEGIN
    IF has_completed_at THEN
      sql := sql || ', completed_at = NOW()';
    END IF;
    IF has_completed_by AND v_uid IS NOT NULL THEN
      sql := sql || ', completed_by = ' || quote_literal(v_uid::text)::text || '::uuid';
    END IF;
    IF has_completed_via THEN
      sql := sql || ', completed_via = ' || COALESCE(quote_literal(p_completed_via), quote_literal('rpc'));
    END IF;
    IF has_completed_reason THEN
      sql := sql || ', completed_reason = ' || COALESCE(quote_literal(p_reason), quote_literal('')); 
    END IF;
    sql := sql || ' WHERE id = ' || quote_literal(p_mission_id::text) || '::uuid';

    EXECUTE sql;
  END;

  -- Récupérer la mission mise à jour
  SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id;

  RETURN jsonb_build_object(
    'ok', true,
    'alreadyCompleted', false,
    'mission', to_jsonb(v_mission)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_mission(UUID, TEXT, TEXT) TO authenticated;