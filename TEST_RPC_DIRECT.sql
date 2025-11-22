-- Test direct du RPC pour vérifier qu'il fonctionne
-- Remplacez 'VOTRE-MISSION-UUID' par l'UUID de la mission de test

SELECT close_mission_after_arrival('VOTRE-MISSION-UUID');

-- Vérifier que la fonction existe bien
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'close_mission_after_arrival';
