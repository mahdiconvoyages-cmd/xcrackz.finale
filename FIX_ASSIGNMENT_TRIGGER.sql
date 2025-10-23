-- 🔥 FIX: Permettre plusieurs assignations sur une même mission

-- 1. Vérifier les triggers existants sur mission_assignments
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'mission_assignments';

-- 2. Vérifier les fonctions qui contiennent "already assigned"
SELECT 
    proname as function_name,
    prosrc as source_code
FROM pg_proc
WHERE prosrc ILIKE '%already assigned%' OR prosrc ILIKE '%déjà assignée%';

-- 3. Désactiver ou supprimer le trigger qui bloque
-- (à adapter selon ce que la requête #1 retourne)
-- DROP TRIGGER IF EXISTS prevent_duplicate_assignment ON mission_assignments;
-- DROP FUNCTION IF EXISTS check_mission_assignment();

-- 4. Alternative: Modifier la fonction pour permettre plusieurs assignations
-- Si une fonction existe, la modifier pour accepter plusieurs assignations actives
