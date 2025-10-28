-- ============================================
-- DIAGNOSTIC: Vérifier la colonne assigned
-- ============================================

-- 1. Voir TOUTES les colonnes de la table missions
SELECT 
    '📋 Colonnes de la table missions:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'missions'
ORDER BY ordinal_position;

-- 2. Chercher toutes les colonnes qui contiennent "assign"
SELECT 
    '🔍 Colonnes contenant "assign":' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'missions'
AND column_name ILIKE '%assign%';

-- 3. Voir les 3 premières missions avec TOUTES les colonnes
SELECT 
    '📊 Exemple de données (toutes colonnes):' as info;

SELECT *
FROM missions
LIMIT 3;

-- 4. Vérifier spécifiquement les colonnes d'assignation possibles
SELECT 
    '🎯 Colonnes d\'assignation possibles:' as info,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id'
    ) THEN '✅ assigned_to_user_id existe'
    ELSE '❌ assigned_to_user_id N''EXISTE PAS'
    END as status_assigned_to_user_id,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'assigned_user_id'
    ) THEN '✅ assigned_user_id existe'
    ELSE '❌ assigned_user_id N''EXISTE PAS'
    END as status_assigned_user_id,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'assignee_id'
    ) THEN '✅ assignee_id existe'
    ELSE '❌ assignee_id N''EXISTE PAS'
    END as status_assignee_id,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'driver_id'
    ) THEN '✅ driver_id existe'
    ELSE '❌ driver_id N''EXISTE PAS'
    END as status_driver_id;

-- 5. Voir la définition complète de la table
SELECT 
    '📝 Définition de la table:' as info;
    
SELECT 
    pg_get_tabledef('public', 'missions');
