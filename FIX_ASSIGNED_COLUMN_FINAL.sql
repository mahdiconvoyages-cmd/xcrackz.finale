-- ============================================
-- FIX FINAL: Résoudre le problème de colonne assigned
-- ============================================

-- ÉTAPE 1: Voir exactement quelles colonnes existent
SELECT 
    '📋 Colonnes d''assignation dans missions:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'missions'
AND (column_name LIKE '%assign%' OR column_name LIKE '%driver%')
ORDER BY column_name;

-- ÉTAPE 2: Diagnostiquer le problème
DO $$
DECLARE
    v_has_assigned_to boolean;
    v_has_assigned boolean;
BEGIN
    -- Vérifier assigned_to_user_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' 
        AND column_name = 'assigned_to_user_id'
    ) INTO v_has_assigned_to;
    
    -- Vérifier assigned_user_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' 
        AND column_name = 'assigned_user_id'
    ) INTO v_has_assigned;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNOSTIC DES COLONNES:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'assigned_to_user_id existe: %', v_has_assigned_to;
    RAISE NOTICE 'assigned_user_id existe: %', v_has_assigned;
    RAISE NOTICE '========================================';
    
    -- Solution selon le cas
    IF v_has_assigned_to AND v_has_assigned THEN
        RAISE NOTICE '⚠️  Les DEUX colonnes existent! On va fusionner.';
    ELSIF v_has_assigned_to THEN
        RAISE NOTICE '✅ assigned_to_user_id existe, on l''utilise';
    ELSIF v_has_assigned THEN
        RAISE NOTICE '⚠️  Seulement assigned_user_id existe, on va créer assigned_to_user_id';
    ELSE
        RAISE NOTICE '❌ AUCUNE colonne n''existe! On va créer assigned_to_user_id';
    END IF;
END $$;

-- ÉTAPE 3: CRÉER assigned_to_user_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' 
        AND column_name = 'assigned_to_user_id'
    ) THEN
        -- Créer la colonne
        ALTER TABLE missions 
        ADD COLUMN assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
        
        -- Créer l'index
        CREATE INDEX IF NOT EXISTS idx_missions_assigned_to_user 
        ON missions(assigned_to_user_id);
        
        RAISE NOTICE '✅ Colonne assigned_to_user_id créée';
        
        -- Si assigned_user_id existe, copier les données
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'missions' 
            AND column_name = 'assigned_user_id'
        ) THEN
            UPDATE missions 
            SET assigned_to_user_id = assigned_user_id
            WHERE assigned_user_id IS NOT NULL
            AND assigned_to_user_id IS NULL;
            
            RAISE NOTICE '✅ Données copiées de assigned_user_id vers assigned_to_user_id';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  assigned_to_user_id existe déjà';
    END IF;
END $$;

-- ÉTAPE 4: Recréer la fonction join_mission_with_code
DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID) CASCADE;

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
    RAISE NOTICE '🔍 Recherche mission avec code: %, user: %', p_share_code, p_user_id;
    
    -- Trouver la mission
    SELECT 
        id, 
        user_id,
        assigned_to_user_id,
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
        RAISE NOTICE '❌ Mission non trouvée avec code: %', p_share_code;
        RETURN json_build_object(
            'success', false,
            'error', 'Code invalide',
            'message', 'Aucune mission trouvée avec ce code'
        );
    END IF;
    
    RAISE NOTICE '✅ Mission trouvée: %, créateur: %, assignée à: %, statut: %', 
        v_mission_id, v_creator_id, v_current_assigned_id, v_status;
    
    -- Vérifier que ce n'est pas le créateur
    IF v_creator_id = p_user_id THEN
        RAISE NOTICE '❌ L''utilisateur est le créateur de la mission';
        RETURN json_build_object(
            'success', false,
            'error', 'Mission propre',
            'message', 'Vous ne pouvez pas rejoindre votre propre mission'
        );
    END IF;
    
    -- Vérifier si déjà assignée à quelqu'un d'autre
    IF v_current_assigned_id IS NOT NULL AND v_current_assigned_id != p_user_id THEN
        RAISE NOTICE '❌ Mission déjà assignée à: %', v_current_assigned_id;
        RETURN json_build_object(
            'success', false,
            'error', 'Mission déjà assignée',
            'message', 'Cette mission a déjà été assignée à un autre utilisateur'
        );
    END IF;
    
    -- Vérifier le statut
    IF v_status IN ('cancelled', 'completed') THEN
        RAISE NOTICE '❌ Mission terminée/annulée: %', v_status;
        RETURN json_build_object(
            'success', false,
            'error', 'Mission terminée',
            'message', 'Cette mission est déjà terminée ou annulée'
        );
    END IF;
    
    -- Assigner la mission
    UPDATE missions 
    SET 
        assigned_to_user_id = p_user_id,
        status = CASE 
            WHEN status = 'pending' THEN 'in_progress'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_mission_id;
    
    RAISE NOTICE '✅ Mission assignée avec succès à l''utilisateur: %', p_user_id;
    
    -- Retourner succès
    RETURN json_build_object(
        'success', true,
        'mission_id', v_mission_id,
        'message', 'Mission ajoutée avec succès à votre liste'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERREUR: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'Erreur serveur',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 5: Donner les permissions
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO anon;

-- ÉTAPE 6: Forcer PostgREST à recharger
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ÉTAPE 7: Vérification finale
SELECT '========================================' as separator;
SELECT '✅ VÉRIFICATION FINALE:' as info;
SELECT '========================================' as separator;

-- Vérifier les colonnes
SELECT 
    '📋 Colonnes finales:' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'missions'
AND (column_name LIKE '%assign%' OR column_name LIKE '%driver%')
ORDER BY column_name;

-- Vérifier la fonction
SELECT 
    '✅ Fonction recréée:' as info,
    proname as nom,
    pg_get_function_identity_arguments(oid) as parametres
FROM pg_proc 
WHERE proname = 'join_mission_with_code';

-- Compter les missions avec codes
SELECT 
    '📊 Missions avec codes de partage:' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN assigned_to_user_id IS NOT NULL THEN 1 END) as deja_assignees,
    COUNT(CASE WHEN assigned_to_user_id IS NULL THEN 1 END) as disponibles
FROM missions
WHERE share_code IS NOT NULL;

SELECT '========================================' as separator;
SELECT '✅ SCRIPT TERMINÉ!' as info;
SELECT '========================================' as separator;
