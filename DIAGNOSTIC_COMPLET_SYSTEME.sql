-- ============================================
-- DIAGNOSTIC COMPLET SYSTÈME
-- ============================================

-- 1. Vérifier la structure de la table missions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'missions'
AND column_name IN ('id', 'share_code', 'assigned_to_user_id', 'user_id', 'status')
ORDER BY column_name;

-- 2. Compter les missions
SELECT 
    COUNT(*) as "Total missions",
    COUNT(share_code) as "Avec code",
    COUNT(*) - COUNT(share_code) as "Sans code",
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as "Pending",
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as "In Progress",
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as "Completed"
FROM missions;

-- 3. Voir quelques missions
SELECT 
    id,
    reference,
    share_code,
    status,
    user_id,
    assigned_to_user_id,
    created_at
FROM missions
ORDER BY created_at DESC
LIMIT 3;

-- 4. Vérifier la fonction
SELECT 
    p.proname as fonction,
    pg_get_function_identity_arguments(p.oid) as parametres,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as securite
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('join_mission_with_code', 'generate_share_code', 'auto_generate_share_code');

-- 5. Test avec des données fictives (sans exécution réelle)
SELECT 
    'XZ-ABC-123' as "Code exemple",
    auth.uid() as "Votre user_id",
    'Utilisez ces valeurs pour tester manuellement' as "Info";
