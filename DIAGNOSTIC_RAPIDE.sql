-- ============================================
-- DIAGNOSTIC COMPLET EN UNE FOIS
-- ============================================

-- Résultat 1 : Total missions
SELECT 'Total missions en base' as info, COUNT(*)::text as value FROM missions
UNION ALL
-- Résultat 2 : Mon user ID
SELECT 'Mon user ID' as info, auth.uid()::text as value
UNION ALL
-- Résultat 3 : Missions avec assigned_to_user_id
SELECT 'Missions avec assigned_to_user_id' as info, COUNT(assigned_to_user_id)::text as value FROM missions
UNION ALL
-- Résultat 4 : Mes missions créées
SELECT 'Mes missions créées (user_id)' as info, COUNT(*)::text as value FROM missions WHERE user_id = auth.uid()
UNION ALL
-- Résultat 5 : Mes missions assignées
SELECT 'Mes missions assignées (assigned_to_user_id)' as info, COUNT(*)::text as value FROM missions WHERE assigned_to_user_id = auth.uid()
UNION ALL
-- Résultat 6 : Mes assignments dans mission_assignments
SELECT 'Mes assignments (mission_assignments)' as info, COUNT(*)::text as value FROM mission_assignments WHERE user_id = auth.uid();

-- Si le résultat montre :
-- - Total missions > 0 mais Mes missions = 0
--   → Vous n'êtes ni créateur ni assigné des missions existantes
--   → SOLUTION : Créer une mission de test OU migrer les données

-- - Total missions = 0
--   → Base vide, créer une mission de test

-- - Mes assignments (mission_assignments) > 0 mais Mes missions assignées = 0
--   → Les données sont dans mission_assignments mais pas dans missions.assigned_to_user_id
--   → SOLUTION : Migrer les données
