-- ============================================
-- DEBUG: join_mission_with_code
-- Teste la fonction avec des données réelles
-- ============================================

-- 1. Vérifier qu'une mission avec code existe
SELECT 
    id,
    reference,
    share_code,
    user_id,
    assigned_to_user_id,
    status
FROM missions 
WHERE share_code IS NOT NULL
LIMIT 3;

-- 2. Tester la fonction (remplacez les valeurs)
-- NOTE: Remplacez 'XZ-ABC-123' par un vrai code de la requête ci-dessus
-- NOTE: Remplacez 'votre-user-id' par votre vrai user_id

/*
SELECT join_mission_with_code(
    'XZ-ABC-123',  -- Remplacer par un vrai code
    'votre-user-id'::uuid  -- Remplacer par votre user_id
);
*/

-- 3. Vérifier les permissions RPC
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'join_mission_with_code';

-- 4. Accorder les permissions si nécessaire
GRANT EXECUTE ON FUNCTION join_mission_with_code TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code TO anon;

SELECT 'Permissions accordées' as result;
