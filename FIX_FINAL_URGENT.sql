-- ============================================
-- FIX FINAL URGENT
-- ============================================

-- ÉTAPE 1: Supprimer TOUTES les versions de la fonction
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT) CASCADE;
DROP FUNCTION IF EXISTS join_mission_with_code CASCADE;

-- ÉTAPE 2: Vérifier que les colonnes existent
DO $$
BEGIN
    -- Vérifier assigned_to_user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' 
        AND column_name = 'assigned_to_user_id'
    ) THEN
        RAISE EXCEPTION 'La colonne assigned_to_user_id n''existe pas!';
    END IF;
    
    RAISE NOTICE '✅ Colonne assigned_to_user_id existe';
END $$;

-- ÉTAPE 3: Recréer la fonction (VERSION SIMPLE POUR TESTER)
CREATE OR REPLACE FUNCTION join_mission_with_code(
    p_share_code TEXT,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_mission RECORD;
    v_mission_id UUID;
BEGIN
    -- Log pour debug
    RAISE NOTICE 'Recherche mission avec code: %', p_share_code;
    RAISE NOTICE 'User ID: %', p_user_id;
    
    -- Chercher la mission par code (sans SELECT INTO pour éviter les problèmes)
    SELECT id INTO v_mission_id
    FROM missions 
    WHERE UPPER(REPLACE(share_code, ' ', '')) = UPPER(REPLACE(p_share_code, ' ', ''))
    LIMIT 1;
    
    -- Vérifier si trouvée
    IF v_mission_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Code invalide',
            'message', 'Aucune mission trouvée avec ce code'
        );
    END IF;
    
    -- Récupérer toutes les infos de la mission
    SELECT 
        id, 
        reference, 
        user_id, 
        assigned_to_user_id,  -- ⚠️ Nom exact de la colonne
        status, 
        share_code
    INTO v_mission 
    FROM missions 
    WHERE id = v_mission_id;
    
    RAISE NOTICE 'Mission trouvée: %, créateur: %, assigné à: %', 
        v_mission.id, v_mission.user_id, v_mission.assigned_to_user_id;
    
    -- Vérifier que ce n'est pas le créateur
    IF v_mission.user_id = p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission propre',
            'message', 'Vous ne pouvez pas rejoindre votre propre mission'
        );
    END IF;
    
    -- Vérifier si déjà assignée
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
    
    -- Assigner la mission (UPDATE SIMPLE)
    UPDATE missions 
    SET 
        assigned_to_user_id = p_user_id,  -- ⚠️ Nom exact de la colonne
        status = CASE 
            WHEN status = 'pending' THEN 'in_progress'::text
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_mission_id;
    
    RAISE NOTICE '✅ Mission assignée avec succès';
    
    -- Retourner succès
    RETURN json_build_object(
        'success', true,
        'mission_id', v_mission_id,
        'message', 'Mission ajoutée avec succès à votre liste'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'Erreur serveur',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 4: Permissions
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO anon;

-- ÉTAPE 5: FORCER le reload du schéma PostgREST
NOTIFY pgrst, 'reload schema';

-- ÉTAPE 6: Vérification finale
SELECT 
    '✅ FONCTION RECRÉÉE' as statut,
    proname as nom,
    pg_get_function_identity_arguments(oid) as parametres,
    prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'join_mission_with_code';

-- ÉTAPE 7: Test rapide de la structure
SELECT 
    '✅ Test de la fonction' as info,
    join_mission_with_code('CODE-TEST', '00000000-0000-0000-0000-000000000000'::uuid) as resultat;
