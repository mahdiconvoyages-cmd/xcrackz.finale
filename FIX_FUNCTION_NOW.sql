-- ============================================
-- FIX URGENT: Recréer la fonction join_mission_with_code
-- ============================================

-- ÉTAPE 1: Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID);

-- ÉTAPE 2: Recréer la fonction avec la bonne structure
CREATE OR REPLACE FUNCTION join_mission_with_code(
    p_share_code TEXT,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_mission RECORD;
BEGIN
    -- Chercher la mission par code
    SELECT 
        id, reference, user_id, assigned_to_user_id, 
        status, share_code, pickup_address, delivery_address,
        created_at, updated_at
    INTO v_mission 
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
    
    -- Vérifier que ce n'est pas le créateur
    IF v_mission.user_id = p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission propre',
            'message', 'Vous ne pouvez pas rejoindre votre propre mission'
        );
    END IF;
    
    -- Vérifier si déjà assignée à quelqu'un d'autre
    IF v_mission.assigned_to_user_id IS NOT NULL AND v_mission.assigned_to_user_id != p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission déjà assignée',
            'message', 'Cette mission a déjà été assignée à un autre utilisateur'
        );
    END IF;
    
    -- Vérifier le statut
    IF v_mission.status IN ('cancelled', 'completed') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission terminée',
            'message', 'Cette mission est déjà terminée ou annulée'
        );
    END IF;
    
    -- Assigner la mission
    UPDATE missions 
    SET assigned_to_user_id = p_user_id,
        status = CASE 
            WHEN status = 'pending' THEN 'in_progress'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_mission.id;
    
    -- Récupérer la mission mise à jour
    SELECT * INTO v_mission FROM missions WHERE id = v_mission.id;
    
    RETURN json_build_object(
        'success', true,
        'mission', row_to_json(v_mission),
        'message', 'Mission ajoutée avec succès à votre liste'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 3: Accorder les permissions
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO anon;

-- ÉTAPE 4: Forcer le refresh
NOTIFY pgrst, 'reload schema';

-- ÉTAPE 5: Vérification
SELECT 
    '✅ Fonction recréée avec succès!' as resultat,
    proname as nom_fonction,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'join_mission_with_code';
