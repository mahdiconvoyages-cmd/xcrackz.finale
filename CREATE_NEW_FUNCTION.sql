-- ============================================
-- SOLUTION RADICALE: Nouvelle fonction avec nouveau nom
-- ============================================

-- Créer une fonction avec un NOUVEAU NOM
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
    -- Trouver la mission avec assigned_user_id
    SELECT 
        id, 
        user_id,
        assigned_user_id,  -- ✅ assigned_user_id
        status
    INTO 
        v_mission_id,
        v_creator_id,
        v_current_assigned_id,
        v_status
    FROM missions 
    WHERE UPPER(TRIM(REPLACE(share_code, '-', ''))) = UPPER(TRIM(REPLACE(p_share_code, '-', '')))
    LIMIT 1;
    
    IF v_mission_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Code invalide',
            'message', 'Aucune mission trouvée avec ce code'
        );
    END IF;
    
    IF v_creator_id = p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission propre',
            'message', 'Vous ne pouvez pas rejoindre votre propre mission'
        );
    END IF;
    
    IF v_current_assigned_id IS NOT NULL AND v_current_assigned_id != p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission déjà assignée',
            'message', 'Cette mission a déjà été assignée à un autre utilisateur'
        );
    END IF;
    
    IF v_status IN ('cancelled', 'completed') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission terminée',
            'message', 'Cette mission est déjà terminée ou annulée'
        );
    END IF;
    
    -- ASSIGNER avec assigned_user_id
    UPDATE missions 
    SET 
        assigned_user_id = p_user_id,  -- ✅ assigned_user_id
        status = CASE 
            WHEN status = 'pending' THEN 'in_progress'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_mission_id;
    
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

-- Permissions
GRANT EXECUTE ON FUNCTION join_mission_v2(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_v2(TEXT, UUID) TO anon;

-- Reload
NOTIFY pgrst, 'reload schema';

-- TEST
SELECT join_mission_v2(
    'XZ-UZ6-37L',
    '784dd826-62ae-4d94-81a0-618953d63010'::uuid
) as resultat;
