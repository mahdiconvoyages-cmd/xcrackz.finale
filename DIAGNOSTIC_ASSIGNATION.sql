-- ============================================
-- DIAGNOSTIC: Vérifier le nom de colonne utilisé
-- Date: 2025-11-07
-- ============================================

-- 1. Vérifier quelle colonne existe dans la table missions
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'missions'
  AND column_name IN ('assigned_user_id', 'assigned_to_user_id')
ORDER BY column_name;

-- 2. Vérifier le code source de la fonction join_mission_with_code
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'join_mission_with_code';

-- 3. Compter les missions avec assignation
SELECT 
    COUNT(*) FILTER (WHERE assigned_to_user_id IS NOT NULL) as avec_assigned_to_user_id,
    COUNT(*) as total_missions
FROM missions;

-- ============================================
-- RÉSULTAT ATTENDU:
-- ============================================
-- Colonne: assigned_to_user_id doit exister
-- Fonction: doit contenir "assigned_to_user_id" et PAS "assigned_user_id"
-- ============================================
