-- =====================================================
-- Migration: Ajout de la colonne agent_name
-- Description: Ajoute le champ "mandataire" (agent/représentant) aux missions
-- Date: 2025-01-08
-- =====================================================

-- Ajout de la colonne agent_name à la table missions
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS agent_name TEXT;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN missions.agent_name IS 'Nom du mandataire ou agent représentant pour cette mission de convoyage';

-- Créer un index pour améliorer les performances de recherche sur agent_name
CREATE INDEX IF NOT EXISTS idx_missions_agent_name 
ON missions(agent_name) 
WHERE agent_name IS NOT NULL;

-- Vérification: Afficher la structure de la table missions
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'missions'
AND column_name = 'agent_name';

-- Exemple de requête pour vérifier les missions avec mandataire
-- SELECT id, reference, client_name, agent_name, status 
-- FROM missions 
-- WHERE agent_name IS NOT NULL
-- ORDER BY created_at DESC;
