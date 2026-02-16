-- ============================================
-- ÉTAPE 3: RECRÉER LA FONCTION (AVEC assigned_user_id)
-- ============================================
-- Utilise assigned_user_id au lieu de assigned_to_user_id

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID) CASCADE;

-- Créer la nouvelle fonction
CREATE OR REPLACE FUNCTION join_mission_with_code(
    p_share_code TEXT,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_mission_id UUID;
    v_creator_id UUID;
    v_current_assigned_id UUID;
    v_status TEXT;
BEGIN
    -- Trouver la mission (UTILISE assigned_user_id)
    SELECT 
        id, 
        user_id,
        assigned_user_id,
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
    
    -- Vérifier si déjà assignée à quelqu'un d'autre
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
    
    -- Assigner la mission
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO anon;

-- Forcer le reload
NOTIFY pgrst, 'reload schema';

-- Vérification
SELECT 
    '✅ Fonction recréée' as info,
    proname as nom,
    pg_get_function_identity_arguments(oid) as parametres
FROM pg_proc 
WHERE proname = 'join_mission_with_code';
