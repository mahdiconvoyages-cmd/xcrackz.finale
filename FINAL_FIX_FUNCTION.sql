-- ============================================
-- FIX FINAL: Forcer la recréation de la fonction
-- ============================================

-- ÉTAPE 1: Tuer TOUT ce qui pourrait cacher la fonction
DO $$
BEGIN
    -- Tuer les connexions actives
    PERFORM pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = current_database()
    AND pid != pg_backend_pid()
    AND application_name LIKE '%postgrest%';
    
    RAISE NOTICE 'Connexions PostgREST terminées';
END $$;

-- ÉTAPE 2: Supprimer TOUTES les versions de la fonction
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT) CASCADE;
DROP FUNCTION IF EXISTS join_mission_with_code CASCADE;

-- Vérifier suppression
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'join_mission_with_code') THEN
        RAISE EXCEPTION 'La fonction existe encore après DROP!';
    END IF;
    RAISE NOTICE '✅ Fonction supprimée';
END $$;

-- ÉTAPE 4: Recréer la fonction (VERSION FINALE avec assigned_user_id)
CREATE FUNCTION join_mission_with_code(
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
    -- Trouver la mission avec assigned_user_id (PAS assigned_to_user_id)
    SELECT 
        id, 
        user_id,
        assigned_user_id,  -- ⚠️ IMPORTANT: assigned_user_id
        status
    INTO 
        v_mission_id,
        v_creator_id,
        v_current_assigned_id,
        v_status
    FROM missions 
    WHERE UPPER(TRIM(REPLACE(share_code, '-', ''))) = UPPER(TRIM(REPLACE(p_share_code, '-', '')))
    LIMIT 1;
    
    -- Mission non trouvée
    IF v_mission_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Code invalide',
            'message', 'Aucune mission trouvée avec ce code'
        );
    END IF;
    
    -- Vérifier que ce n'est pas le créateur
    IF v_creator_id = p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission propre',
            'message', 'Vous ne pouvez pas rejoindre votre propre mission'
        );
    END IF;
    
    -- Vérifier si déjà assignée
    IF v_current_assigned_id IS NOT NULL AND v_current_assigned_id != p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission déjà assignée',
            'message', 'Cette mission a déjà été assignée à un autre utilisateur'
        );
    END IF;
    
    -- Vérifier le statut
    IF v_status IN ('cancelled', 'completed') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission terminée',
            'message', 'Cette mission est déjà terminée ou annulée'
        );
    END IF;
    
    -- ⚠️ ASSIGNER avec assigned_user_id (PAS assigned_to_user_id)
    UPDATE missions 
    SET 
        assigned_user_id = p_user_id,  -- ⚠️ IMPORTANT: assigned_user_id
        status = CASE 
            WHEN status = 'pending' THEN 'in_progress'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_mission_id;
    
    -- Retourner succès
    RETURN json_build_object(
        'success', true,
        'mission_id', v_mission_id,
        'message', 'Mission ajoutée avec succès à votre liste'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Erreur serveur',
            'message', SQLERRM
        );
END;
$$;

-- ÉTAPE 5: Permissions
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO anon;

-- ÉTAPE 6: Invalider le cache PostgREST (MULTIPLE FOIS)
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- ÉTAPE 7: VOIR LE CODE SOURCE pour CONFIRMER
SELECT 
    '📝 CODE SOURCE (doit contenir assigned_user_id):' as info;

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'join_mission_with_code';

-- ÉTAPE 8: TEST DIRECT
SELECT 
    '🧪 TEST DIRECT:' as info;

SELECT join_mission_with_code(
    'XZ-UZ6-37L',
    '784dd826-62ae-4d94-81a0-618953d63010'::uuid
) as resultat;
