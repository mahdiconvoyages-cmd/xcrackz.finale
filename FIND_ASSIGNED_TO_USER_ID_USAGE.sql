-- ============================================
-- TROUVER TOUS LES ENDROITS OÙ assigned_to_user_id EST UTILISÉ
-- ============================================

-- 1. Chercher dans les VUES
SELECT 
    'VIEW' as type,
    schemaname,
    viewname as name,
    definition
FROM pg_views
WHERE definition ILIKE '%assigned_to_user_id%'
AND schemaname = 'public';

-- 2. Chercher dans les TRIGGERS
SELECT 
    'TRIGGER' as type,
    trigger_schema,
    trigger_name as name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE action_statement ILIKE '%assigned_to_user_id%'
AND trigger_schema = 'public';

-- 3. Chercher dans les FONCTIONS (toutes)
SELECT 
    'FUNCTION' as type,
    n.nspname as schema,
    p.proname as name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'  -- Seulement les fonctions normales, pas les agrégats
AND pg_get_functiondef(p.oid) ILIKE '%assigned_to_user_id%';

-- 4. Vérifier les CONTRAINTES
SELECT 
    'CONSTRAINT' as type,
    conname as name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname ILIKE '%assigned_to_user_id%';
