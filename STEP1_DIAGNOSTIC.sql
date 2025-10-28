-- ============================================
-- ÉTAPE 1: DIAGNOSTIC - Quelles colonnes existent ?
-- ============================================
-- Exécutez cette requête SEULE d'abord

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'missions'
AND (column_name LIKE '%assign%' OR column_name LIKE '%driver%')
ORDER BY column_name;
