-- ============================================
-- FIX V2: Ne pas changer le statut en in_progress lors du join
-- Le statut doit rester 'pending' jusqu'à ce que l'utilisateur
-- clique sur "Démarrer la mission"
-- 
-- IMPORTANT: Reprend la logique originale avec détection dynamique
-- des colonnes (assigned_user_id vs assigned_to_user_id)
-- ============================================

-- D'abord dropper toutes les versions existantes pour être sûr
DROP FUNCTION IF EXISTS claim_mission(TEXT, UUID);

-- Recréer claim_mission avec détection dynamique SANS changement de statut
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
  v_reference TEXT;
BEGIN
  -- Sécurité: vérifier identité
  BEGIN
    IF auth.uid() IS NOT NULL AND p_user_id IS NOT NULL AND auth.uid() <> p_user_id THEN
      RETURN json_build_object('success', false, 'error', 'identité invalide');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Trouver la mission par code (utilise normalized_share_code si présent)
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

  -- Lire la référence
  BEGIN
    SELECT reference INTO v_reference FROM public.missions WHERE id = v_mission_id;
  EXCEPTION WHEN OTHERS THEN
    v_reference := NULL;
  END;

  -- Statuts terminés/annulés
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
      'message', 'Mission déjà présente dans votre liste',
      'mission', json_build_object(
        'id', v_mission_id,
        'reference', v_reference
      )
    );
  END IF;

  -- ============================================
  -- ASSIGNATION SANS CHANGEMENT DE STATUT
  -- Le statut reste tel quel (pending) jusqu'à ce que
  -- l'utilisateur clique sur "Démarrer la mission"
  -- ============================================
  IF v_has_assigned_to THEN
    EXECUTE 'UPDATE public.missions SET assigned_to_user_id = $1, updated_at = now() WHERE id = $2'
    USING p_user_id, v_mission_id;
  ELSIF v_has_assigned THEN
    EXECUTE 'UPDATE public.missions SET assigned_user_id = $1, updated_at = now() WHERE id = $2'
    USING p_user_id, v_mission_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Colonne d''assignation absente');
  END IF;

  -- Relire le statut après update
  SELECT status INTO v_status FROM public.missions WHERE id = v_mission_id;

  RETURN json_build_object(
    'success', true,
    'mission_id', v_mission_id,
    'share_code', v_share_code,
    'status', v_status,
    'message', 'Mission ajoutée à votre liste',
    'mission', json_build_object(
      'id', v_mission_id,
      'reference', v_reference
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Erreur serveur', 'details', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Wrapper de compatibilité
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID);
CREATE OR REPLACE FUNCTION join_mission_with_code(
  p_share_code TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
BEGIN
  RETURN claim_mission(p_share_code, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Corriger aussi join_mission_v2 (ancienne fonction, au cas où)
DROP FUNCTION IF EXISTS join_mission_v2(TEXT, UUID);
CREATE OR REPLACE FUNCTION join_mission_v2(
    p_share_code TEXT,
    p_user_id UUID
)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_mission_id UUID;
    v_creator_id UUID;
    v_current_assigned_id UUID;
    v_status TEXT;
BEGIN
    SELECT id, user_id, assigned_user_id, status
    INTO v_mission_id, v_creator_id, v_current_assigned_id, v_status
    FROM missions 
    WHERE UPPER(TRIM(REPLACE(share_code, '-', ''))) = UPPER(TRIM(REPLACE(p_share_code, '-', '')))
    LIMIT 1;
    
    IF v_mission_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Code invalide', 'message', 'Aucune mission trouvée avec ce code');
    END IF;
    
    IF v_creator_id = p_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Mission propre', 'message', 'Vous ne pouvez pas rejoindre votre propre mission');
    END IF;
    
    IF v_current_assigned_id IS NOT NULL AND v_current_assigned_id != p_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Mission déjà assignée', 'message', 'Cette mission a déjà été assignée à un autre utilisateur');
    END IF;
    
    IF v_status IN ('cancelled', 'completed') THEN
        RETURN json_build_object('success', false, 'error', 'Mission terminée', 'message', 'Cette mission est déjà terminée ou annulée');
    END IF;
    
    -- Assigner SANS changer le statut
    UPDATE missions 
    SET 
        assigned_user_id = p_user_id,
        updated_at = NOW()
    WHERE id = v_mission_id;
    
    RETURN json_build_object(
        'success', true,
        'mission_id', v_mission_id,
        'message', 'Mission ajoutée avec succès à votre liste'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Erreur serveur', 'message', SQLERRM);
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION claim_mission(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_mission(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION join_mission_v2(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_v2(TEXT, UUID) TO anon;

-- Notifier PostgREST pour rafraîchir le cache du schema
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload config');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================
-- AUSSI: Remettre en 'pending' les missions qui ont été
-- mises en 'in_progress' par erreur lors du join
-- (sans inspection de départ)
-- ============================================
UPDATE public.missions
SET status = 'pending', updated_at = now()
WHERE status = 'in_progress'
  AND assigned_user_id IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT mission_id FROM public.inspection_reports 
    WHERE type IN ('departure', 'depart')
  );
