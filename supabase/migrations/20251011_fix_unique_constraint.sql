-- ============================================
-- FIX CONTRAINTE UNIQUE ASSIGNATIONS
-- Date : 11 octobre 2025
-- Problème : La contrainte UNIQUE bloque même les missions annulées
-- Solution : Remplacer par une contrainte partielle (UNIQUE WHERE status != 'cancelled')
-- ============================================

-- 1. Supprimer l'ancienne contrainte UNIQUE
ALTER TABLE mission_assignments 
DROP CONSTRAINT IF EXISTS mission_assignments_mission_id_contact_id_key;

-- 2. Créer un INDEX UNIQUE partiel qui exclut les missions annulées
-- Cela permet d'avoir plusieurs assignations annulées, mais une seule active
DROP INDEX IF EXISTS idx_unique_active_assignment;

CREATE UNIQUE INDEX idx_unique_active_assignment 
ON mission_assignments (mission_id, contact_id) 
WHERE status != 'cancelled';

-- ============================================
-- VÉRIFICATIONS
-- ============================================

SELECT 'Contrainte UNIQUE corrigée : exclut les missions annulées !' as message;

-- Vérifier l'index
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'mission_assignments'
  AND indexname = 'idx_unique_active_assignment';

-- Info : Maintenant on peut avoir plusieurs assignations annulées pour la même mission,
-- mais une seule assignation ACTIVE (assigned, in_progress, completed)
