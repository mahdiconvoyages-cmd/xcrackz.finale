-- ============================================
-- FORCE SCHEMA REFRESH: Régénérer les types Supabase
-- ============================================

-- 1. Vérifier que les colonnes existent bien
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'missions' 
AND column_name IN ('share_code', 'assigned_to_user_id')
ORDER BY column_name;

-- 2. Vérifier quelques missions
SELECT 
    id,
    reference,
    user_id,
    assigned_to_user_id,
    share_code,
    status,
    created_at
FROM missions
LIMIT 5;

-- 3. Forcer le refresh du schéma PostgREST
NOTIFY pgrst, 'reload schema';

SELECT 'Schema refresh demandé - Redémarrez votre application frontend' as message;
