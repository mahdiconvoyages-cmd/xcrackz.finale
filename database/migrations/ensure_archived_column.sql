-- S'assurer que la colonne archived existe et est initialisée
-- Cette migration est idempotente et peut être exécutée plusieurs fois

-- Ajouter la colonne archived si elle n'existe pas
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Mettre à jour toutes les missions existantes qui n'ont pas de valeur pour archived
UPDATE missions
SET archived = FALSE
WHERE archived IS NULL;

-- S'assurer que la valeur par défaut est définie
ALTER TABLE missions 
ALTER COLUMN archived SET DEFAULT FALSE;

-- Optionnel: Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_missions_archived ON missions(archived);

-- Créer un index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_missions_user_archived ON missions(user_id, archived);
