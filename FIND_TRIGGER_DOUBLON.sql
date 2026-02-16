-- 🔍 RECHERCHE DU TRIGGER QUI BLOQUE LES ASSIGNATIONS

-- 1. Lister tous les triggers sur mission_assignments
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'mission_assignments';

-- 2. Rechercher les fonctions qui mentionnent "déjà assignée"
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%déjà assignée%'
  OR routine_definition ILIKE '%already assigned%';

-- 3. Rechercher les contraintes
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'mission_assignments'
  AND constraint_type = 'CHECK';
