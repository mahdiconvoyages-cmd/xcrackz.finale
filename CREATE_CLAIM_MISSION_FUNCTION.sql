-- ============================================
-- CLAIM MISSION VIA CODE (unifié)
-- - Colonne normalisée pour recherche rapide
-- - Fonction claim_mission(p_code, p_user_id)
-- - Wrapper join_mission_with_code pour compatibilité
-- ============================================

-- 1) Ajouter colonne normalisée si share_code existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'share_code'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'normalized_share_code'
    ) THEN
      ALTER TABLE public.missions
      ADD COLUMN normalized_share_code TEXT
      GENERATED ALWAYS AS (upper(regexp_replace(share_code, '[^A-Za-z0-9]', '', 'g'))) STORED;
    END IF;

    -- Index sur la colonne normalisée
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = 'idx_missions_normalized_share_code'
    ) THEN
      CREATE INDEX idx_missions_normalized_share_code ON public.missions(normalized_share_code);
    END IF;
  END IF;
END$$;

-- 2) Fonction claim_mission
DROP FUNCTION IF EXISTS claim_mission(TEXT, UUID);
CREATE OR REPLACE FUNCTION claim_mission(
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_clean TEXT := UPPER(REGEXP_REPLACE(p_code, '[^A-Za-z0-9]', '', 'g'));
  v_mission_id UUID;
  v_creator_id UUID;
  v_status TEXT;
  v_share_code TEXT;
  v_current_assigned UUID;
  v_has_assigned_to BOOLEAN;
  v_has_assigned BOOLEAN;
BEGIN
  -- Sécurité: s'assurer que l'appelant est bien p_user_id (Supabase)
  BEGIN
    IF auth.uid() IS NOT NULL AND p_user_id IS NOT NULL AND auth.uid() <> p_user_id THEN
      RETURN json_build_object('success', false, 'error', 'identité invalide');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- En dehors de Supabase (tests locaux), ignorer cette vérification
    NULL;
  END;

  -- Trouver la mission par code (utilise la colonne normalisée si présente)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'normalized_share_code'
  ) THEN
    SELECT id, user_id, status, share_code
    INTO v_mission_id, v_creator_id, v_status, v_share_code
    FROM public.missions
    WHERE normalized_share_code = v_clean
    FOR UPDATE;
  ELSE
    SELECT id, user_id, status, share_code
    INTO v_mission_id, v_creator_id, v_status, v_share_code
    FROM public.missions
    WHERE UPPER(REGEXP_REPLACE(share_code, '[^A-Za-z0-9]', '', 'g')) = v_clean
    FOR UPDATE;
  END IF;

  IF v_mission_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Code invalide', 'message', 'Aucune mission trouvée avec ce code');
  END IF;

  -- Le créateur ne peut pas se l'assigner
  IF v_creator_id = p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Mission propre', 'message', 'Vous êtes créateur de cette mission');
  END IF;

  -- Déterminer la colonne d'assignation existante
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'assigned_to_user_id'
  ) INTO v_has_assigned_to;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'assigned_user_id'
  ) INTO v_has_assigned;

  -- Lire l'assignation actuelle
  IF v_has_assigned_to THEN
    SELECT assigned_to_user_id INTO v_current_assigned FROM public.missions WHERE id = v_mission_id;
  ELSIF v_has_assigned THEN
    SELECT assigned_user_id INTO v_current_assigned FROM public.missions WHERE id = v_mission_id;
  ELSE
    v_current_assigned := NULL;
  END IF;

  -- Statuts terminés/annulés (tolère canceled/cancelled)
  IF v_status IN ('completed', 'cancelled', 'canceled') THEN
    RETURN json_build_object('success', false, 'error', 'Mission terminée', 'status', v_status);
  END IF;

  -- Si déjà assignée à quelqu'un d'autre
  IF v_current_assigned IS NOT NULL AND v_current_assigned <> p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Mission déjà assignée');
  END IF;

  -- Idempotent: déjà assignée à cet utilisateur
  IF v_current_assigned = p_user_id THEN
    RETURN json_build_object(
      'success', true,
      'alreadyJoined', true,
      'mission_id', v_mission_id,
      'share_code', v_share_code,
      'status', v_status,
      'message', 'Mission déjà présente dans votre liste'
    );
  END IF;

  -- Mettre à jour l'assignation dynamiquement
  IF v_has_assigned_to THEN
    EXECUTE 'UPDATE public.missions SET assigned_to_user_id = $1, status = CASE WHEN status = ''pending'' THEN ''in_progress'' ELSE status END, updated_at = now() WHERE id = $2'
    USING p_user_id, v_mission_id;
  ELSIF v_has_assigned THEN
    EXECUTE 'UPDATE public.missions SET assigned_user_id = $1, status = CASE WHEN status = ''pending'' THEN ''in_progress'' ELSE status END, updated_at = now() WHERE id = $2'
    USING p_user_id, v_mission_id;
  ELSE
    -- Aucune colonne d'assignation: retourner une erreur explicite
    RETURN json_build_object('success', false, 'error', 'Colonne d’assignation absente');
  END IF;

  -- Relire le statut
  SELECT status INTO v_status FROM public.missions WHERE id = v_mission_id;

  RETURN json_build_object(
    'success', true,
    'mission_id', v_mission_id,
    'share_code', v_share_code,
    'status', v_status,
    'message', 'Mission ajoutée à votre liste'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Erreur serveur', 'details', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permissions
GRANT EXECUTE ON FUNCTION claim_mission(TEXT, UUID) TO authenticated;

-- 3) Wrapper de compatibilité: join_mission_with_code → claim_mission
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID);
CREATE OR REPLACE FUNCTION join_mission_with_code(
  p_share_code TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
BEGIN
  RETURN claim_mission(p_share_code, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;

-- Notifier PostgREST (Supabase)
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload config');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
