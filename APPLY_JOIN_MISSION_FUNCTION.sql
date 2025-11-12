-- ================================================
-- APPLIQUER LA FONCTION join_mission_with_code
-- À exécuter dans l'éditeur SQL Supabase
-- ================================================

-- 1. Supprimer les anciennes versions
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS claim_mission(TEXT, UUID) CASCADE;

-- 2. Vérifier quelle colonne d'assignation existe et créer assigned_user_id si nécessaire
DO $$
BEGIN
  -- Vérifier si assigned_user_id existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'assigned_user_id'
  ) THEN
    -- Si assigned_to_user_id existe, la renommer
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'assigned_to_user_id'
    ) THEN
      ALTER TABLE public.missions RENAME COLUMN assigned_to_user_id TO assigned_user_id;
    ELSE
      -- Sinon créer la colonne
      ALTER TABLE public.missions
      ADD COLUMN assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_missions_assigned_user ON public.missions(assigned_user_id);
  END IF;
END$$;

-- 3. Ajouter la colonne normalisée si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'normalized_share_code'
  ) THEN
    ALTER TABLE public.missions
    ADD COLUMN normalized_share_code TEXT
    GENERATED ALWAYS AS (upper(regexp_replace(share_code, '[^A-Za-z0-9]', '', 'g'))) STORED;
    
    CREATE INDEX idx_missions_normalized_share_code ON public.missions(normalized_share_code);
  END IF;
END$$;

-- 4. Créer la fonction claim_mission (utilise assigned_user_id)
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
  v_reference TEXT;
BEGIN
  -- Trouver la mission par code normalisé
  SELECT id, user_id, status, share_code, assigned_user_id, reference
  INTO v_mission_id, v_creator_id, v_status, v_share_code, v_current_assigned, v_reference
  FROM public.missions
  WHERE normalized_share_code = v_clean
  FOR UPDATE;

  -- Vérifications
  IF v_mission_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Code invalide', 'message', 'Aucune mission trouvée avec ce code');
  END IF;

  IF v_creator_id = p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Mission propre', 'message', 'Vous ne pouvez pas rejoindre votre propre mission');
  END IF;

  IF v_status IN ('completed', 'cancelled', 'canceled') THEN
    RETURN json_build_object('success', false, 'error', 'Mission terminée', 'message', 'Cette mission est déjà terminée ou annulée', 'status', v_status);
  END IF;

  IF v_current_assigned IS NOT NULL AND v_current_assigned <> p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Mission déjà assignée', 'message', 'Cette mission est déjà assignée à quelqu''un d''autre');
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

  -- Assigner la mission (utilise assigned_user_id)
  UPDATE public.missions 
  SET 
    assigned_user_id = p_user_id,
    status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END,
    updated_at = now()
  WHERE id = v_mission_id;

  -- Relire le statut
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
  RETURN json_build_object('success', false, 'error', 'Erreur serveur', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Créer le wrapper join_mission_with_code
CREATE OR REPLACE FUNCTION join_mission_with_code(
  p_share_code TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
BEGIN
  RETURN claim_mission(p_share_code, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Donner les permissions
GRANT EXECUTE ON FUNCTION claim_mission(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;

-- 7. Vérifier que tout est OK
DO $$
DECLARE
  v_has_assigned BOOLEAN;
  v_has_normalized BOOLEAN;
BEGIN
  -- Vérifier assigned_user_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'assigned_user_id'
  ) INTO v_has_assigned;
  
  -- Vérifier normalized_share_code
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'normalized_share_code'
  ) INTO v_has_normalized;
  
  RAISE NOTICE '✅ Colonne assigned_user_id: %', CASE WHEN v_has_assigned THEN 'OK' ELSE '❌ MANQUANTE' END;
  RAISE NOTICE '✅ Colonne normalized_share_code: %', CASE WHEN v_has_normalized THEN 'OK' ELSE '❌ MANQUANTE' END;
  RAISE NOTICE '✅ Fonction join_mission_with_code: OK';
  RAISE NOTICE '✅ Fonction claim_mission: OK';
END$$;

-- 8. Test rapide (optionnel - commenter si tu veux pas tester maintenant)
-- SELECT join_mission_with_code('XZ-ABC-123', auth.uid());
