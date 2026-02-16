-- ============================================
-- VÉRIFICATION URGENTE DES COLONNES
-- ============================================

-- 1. Voir TOUTES les colonnes de la table missions
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'missions'
ORDER BY ordinal_position;

-- 2. Chercher spécifiquement assigned_to_user_id
SELECT 
    COUNT(*) as "Existe ?",
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ La colonne existe'
        ELSE '❌ LA COLONNE N''EXISTE PAS!'
    END as statut
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'missions'
AND column_name = 'assigned_to_user_id';

-- 3. Chercher toutes les variantes possibles
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'missions'
AND column_name LIKE '%assigned%'
ORDER BY column_name;
