-- =====================================================
-- 🤖 Migration SQL : Ajout Option IA pour Inspections
-- =====================================================
-- Date: 2025-10-15
-- Description: Ajoute un champ pour indiquer si l'assistant
--              IA Gemini doit être utilisé lors de l'inspection
-- =====================================================

-- 1️⃣ Ajouter colonne use_ai dans table inspections
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS use_ai BOOLEAN DEFAULT true;

-- Commentaire pour documentation
COMMENT ON COLUMN inspections.use_ai IS 'Indique si l''assistant IA Gemini est activé pour cette inspection. TRUE = descriptions IA générées, FALSE = mode manuel/hors ligne';

-- 2️⃣ Créer un index pour optimiser les requêtes par type d'inspection
CREATE INDEX IF NOT EXISTS idx_inspections_use_ai 
ON inspections(use_ai);

-- 3️⃣ Mettre à jour les inspections existantes (toutes à TRUE par défaut)
UPDATE inspections 
SET use_ai = true 
WHERE use_ai IS NULL;

-- =====================================================
-- 📊 Statistiques après migration
-- =====================================================

-- Nombre total d'inspections
SELECT COUNT(*) as total_inspections FROM inspections;

-- Répartition inspections avec/sans IA
SELECT 
  use_ai,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM inspections), 2) as percentage
FROM inspections
GROUP BY use_ai;

-- =====================================================
-- 🔄 Rollback (si nécessaire)
-- =====================================================

-- Pour supprimer la colonne use_ai :
-- ALTER TABLE inspections DROP COLUMN IF EXISTS use_ai;

-- Pour supprimer l'index :
-- DROP INDEX IF EXISTS idx_inspections_use_ai;
