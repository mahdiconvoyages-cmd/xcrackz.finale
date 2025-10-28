-- ============================================
-- FORCER LA SUPPRESSION ET RECRÉATION TOTALE
-- ============================================

-- 1. SUPPRIMER TOUTES LES VERSIONS (avec CASCADE)
DROP FUNCTION IF EXISTS join_mission_with_code CASCADE;
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT) CASCADE;

-- 2. Vérifier que c'est supprimé
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Fonction supprimée'
        ELSE '❌ Fonction existe encore!'
    END as statut
FROM pg_proc 
WHERE proname = 'join_mission_with_code';

-- 3. RECRÉER avec assigned_user_id (PAS assigned_to_user_id)
CREATE FUNCTION join_mission_with_code(
    p_share_code TEXT,
    p_user_id UUID
)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    v_mission_id UUID;
    v_creator_id UUID;
    v_current_assigned_id UUID;
    v_status TEXT;
BEGIN
    -- Trouver la mission avec assigned_user_id
    SELECT 
        id, 
        user_id,
        assigned_user_id,  -- ⚠️ UTILISE assigned_user_id
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
        assigned_user_id = p_user_id,
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

-- 4. Permissions
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO anon;

-- 5. FORCER LE RELOAD
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 6. Vérifier la nouvelle fonction
SELECT 
    '✅ NOUVELLE fonction créée' as info,
    proname as nom,
    pg_get_function_identity_arguments(oid) as parametres
FROM pg_proc 
WHERE proname = 'join_mission_with_code';

-- 7. VOIR LE CODE SOURCE pour confirmer
SELECT 
    '📝 Code source (devrait utiliser assigned_user_id):' as info;
    
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'join_mission_with_code';
