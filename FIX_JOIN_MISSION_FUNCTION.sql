-- ============================================
-- FIX: Fonction join_mission_with_code
-- Date: 27 octobre 2025
-- Correction: Utilise assigned_to_user_id au lieu de assigned_user_id
--             Utilise 'in_progress' au lieu de 'assigned'
-- ============================================

CREATE OR REPLACE FUNCTION join_mission_with_code(
    p_share_code TEXT,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_mission missions%ROWTYPE;
    v_result JSON;
BEGIN
    -- Chercher la mission par code (insensible à la casse et aux espaces)
    SELECT * INTO v_mission 
    FROM missions 
    WHERE UPPER(REPLACE(share_code, ' ', '')) = UPPER(REPLACE(p_share_code, ' ', ''));
    
    -- Vérifier si la mission existe
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Code invalide',
            'message', 'Aucune mission trouvée avec ce code'
        );
    END IF;
    
    -- Vérifier si l'utilisateur est le créateur de la mission
    IF v_mission.user_id = p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission propre',
            'message', 'Vous ne pouvez pas rejoindre votre propre mission'
        );
    END IF;
    
    -- Vérifier si la mission n'est pas déjà assignée
    IF v_mission.assigned_to_user_id IS NOT NULL AND v_mission.assigned_to_user_id != p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission déjà assignée',
            'message', 'Cette mission a déjà été assignée à un autre utilisateur'
        );
    END IF;
    
    -- Assigner la mission à l'utilisateur
    UPDATE missions 
    SET assigned_to_user_id = p_user_id,
        status = 'in_progress',
        updated_at = NOW()
    WHERE id = v_mission.id;
    
    -- Retourner le succès avec les détails de la mission
    RETURN json_build_object(
        'success', true,
        'mission', row_to_json(v_mission),
        'message', 'Mission ajoutée avec succès'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION join_mission_with_code IS 'Permet à un utilisateur de rejoindre une mission via un code de partage';
