-- ============================================
-- FIX URGENT: Tous les problèmes critiques
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- ================================================
-- PROBLÈME 1: Fonction join_mission_with_code
-- Utilise "assigned_user_id" au lieu de "assigned_to_user_id"
-- ================================================

DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID) CASCADE;

CREATE OR REPLACE FUNCTION join_mission_with_code(
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
    -- ✅ CORRECTION: Utilise assigned_to_user_id (la vraie colonne)
    SELECT 
        id, 
        user_id,
        assigned_to_user_id,  -- ✅ CORRECT
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
    
    -- ✅ CORRECT: assigned_to_user_id
    UPDATE missions 
    SET assigned_to_user_id = p_user_id,
        status = 'pending'
    WHERE id = v_mission_id;
    
    -- Succès
    RETURN json_build_object(
        'success', true,
        'mission_id', v_mission_id,
        'message', 'Mission assignée avec succès'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;

-- ================================================
-- TEST
-- ================================================
-- SELECT join_mission_with_code('CODE-TEST', 'user-uuid-here');
