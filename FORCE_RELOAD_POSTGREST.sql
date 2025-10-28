-- ============================================
-- FORCER LE RECHARGEMENT POSTGREST
-- ============================================

-- 1. Tuer les connexions PostgREST
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE application_name = 'PostgREST';

-- 2. Forcer plusieurs reloads
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 3. Attendre 2 secondes
SELECT pg_sleep(2);

-- 4. Re-notifier
NOTIFY pgrst, 'reload schema';

-- 5. Vérifier que la fonction existe
SELECT 
    '✅ Fonction existe' as statut,
    proname as nom,
    pg_get_function_identity_arguments(oid) as parametres
FROM pg_proc 
WHERE proname = 'join_mission_with_code';

-- 6. Voir le code source actuel
SELECT '📝 Code source de la fonction:' as info;
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'join_mission_with_code';
