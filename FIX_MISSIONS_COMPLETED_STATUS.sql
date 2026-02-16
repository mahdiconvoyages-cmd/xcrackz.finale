-- ================================================================
-- CORRECTION AUTOMATIQUE STATUT MISSIONS - 2025-11-06
-- ================================================================
-- Ce script corrige le problème: "missions terminées compteur à 0"
-- 
-- PROBLÈME: Les missions avec inspections départ ET arrivée complétées
--           ne sont pas marquées 'completed' → le compteur reste à 0
--
-- SOLUTION: Mettre à jour automatiquement le statut des missions
-- ================================================================

-- ================================================
-- ÉTAPE 1: DIAGNOSTIC AVANT CORRECTION
-- ================================================

DO $$ 
BEGIN
  RAISE NOTICE '=== DIAGNOSTIC MISSIONS ===';
  RAISE NOTICE 'Total missions: %', (SELECT COUNT(*) FROM missions);
  RAISE NOTICE 'Missions completed: %', (SELECT COUNT(*) FROM missions WHERE status = 'completed');
  RAISE NOTICE 'Missions in_progress: %', (SELECT COUNT(*) FROM missions WHERE status = 'in_progress');
  RAISE NOTICE '';
  RAISE NOTICE 'Missions avec 2 inspections mais pas status completed: %', 
    (SELECT COUNT(*) FROM missions 
     WHERE departure_inspection_completed = true 
       AND arrival_inspection_completed = true 
       AND status != 'completed');
END $$;

-- ================================================
-- ÉTAPE 2: AFFICHER LES MISSIONS À CORRIGER
-- ================================================

SELECT 
  m.id,
  m.reference,
  m.status as status_actuel,
  m.departure_inspection_completed as depart_ok,
  m.arrival_inspection_completed as arrivee_ok,
  m.created_at
FROM missions m
WHERE m.departure_inspection_completed = true 
  AND m.arrival_inspection_completed = true 
  AND m.status != 'completed'
ORDER BY m.created_at DESC;

-- ================================================
-- ÉTAPE 3: CORRECTION AUTOMATIQUE
-- ================================================

UPDATE missions 
SET 
  status = 'completed',
  updated_at = NOW()
WHERE departure_inspection_completed = true 
  AND arrival_inspection_completed = true 
  AND status != 'completed'
RETURNING id, reference, status;

-- ================================================
-- ÉTAPE 4: VÉRIFICATION APRÈS CORRECTION
-- ================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== APRÈS CORRECTION ===';
  RAISE NOTICE 'Missions completed: %', (SELECT COUNT(*) FROM missions WHERE status = 'completed');
  RAISE NOTICE 'Missions in_progress: %', (SELECT COUNT(*) FROM missions WHERE status = 'in_progress');
  RAISE NOTICE '';
  RAISE NOTICE '✅ Correction terminée!';
END $$;

-- ================================================
-- BONUS: CRÉER TRIGGER AUTOMATIQUE
-- ================================================
-- Ce trigger mettra automatiquement le statut à 'completed'
-- quand les deux inspections sont marquées complétées

CREATE OR REPLACE FUNCTION auto_complete_mission()
RETURNS TRIGGER AS $$
BEGIN
  -- Si les deux inspections sont complètes, marquer la mission comme terminée
  IF NEW.departure_inspection_completed = true 
     AND NEW.arrival_inspection_completed = true 
     AND NEW.status != 'completed' THEN
    NEW.status := 'completed';
    RAISE NOTICE '✅ Mission % automatiquement marquée completed', NEW.reference;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_auto_complete_mission ON missions;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_auto_complete_mission
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_mission();

-- ================================================
-- RÉSUMÉ FINAL
-- ================================================

SELECT 
  'Total missions' as metrique,
  COUNT(*)::text as valeur
FROM missions
UNION ALL
SELECT 
  'Missions completed',
  COUNT(*)::text
FROM missions WHERE status = 'completed'
UNION ALL
SELECT 
  'Missions in_progress',
  COUNT(*)::text
FROM missions WHERE status = 'in_progress'
UNION ALL
SELECT 
  'Missions pending',
  COUNT(*)::text
FROM missions WHERE status = 'pending'
ORDER BY metrique;

-- ================================================================
-- ✅ INSTRUCTIONS:
-- ================================================================
-- 1. Ouvrir Supabase Dashboard → SQL Editor
-- 2. Copier/coller ce script complet
-- 3. Cliquer "Run" 
-- 4. Vérifier les NOTICES et résultats
-- 5. Le trigger s'occupera des futures missions automatiquement
-- ================================================================
