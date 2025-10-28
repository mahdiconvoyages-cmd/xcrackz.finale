-- ============================================
-- TEST DIRECT: Fonction join_mission_with_code
-- ============================================

-- ÉTAPE 1: Vérifier que des missions avec codes existent
SELECT 
    COUNT(*) as total_missions,
    COUNT(share_code) as missions_avec_code
FROM missions;

-- ÉTAPE 2: Récupérer les codes disponibles
SELECT 
    share_code as "📋 Code à tester",
    reference as "Mission",
    status as "Statut",
    user_id as "Créateur (NE PAS utiliser ce user_id)",
    assigned_to_user_id as "Déjà assignée à"
FROM missions 
WHERE share_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ÉTAPE 3: Récupérer votre user_id actuel
SELECT auth.uid() as "🔑 MON USER_ID (à utiliser pour tester)";

-- ÉTAPE 4: TEST MANUEL - Remplacez les valeurs ci-dessous
-- Copiez un code de l'ÉTAPE 2 et votre user_id de l'ÉTAPE 3

/*
SELECT join_mission_with_code(
    'XZ-ABC-123',  -- Remplacer par un vrai code de l'ÉTAPE 2
    'votre-user-id'::uuid  -- Remplacer par votre user_id de l'ÉTAPE 3
) as resultat;
*/

-- ÉTAPE 5: Si aucune mission n'a de code, en générer
DO $$
DECLARE
    mission_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mission_count FROM missions WHERE share_code IS NULL;
    
    IF mission_count > 0 THEN
        RAISE NOTICE 'Génération de codes pour % missions...', mission_count;
        
        UPDATE missions 
        SET share_code = generate_share_code()
        WHERE share_code IS NULL;
        
        RAISE NOTICE '✅ Codes générés!';
    ELSE
        RAISE NOTICE 'ℹ️ Toutes les missions ont déjà un code';
    END IF;
END $$;
