-- ================================================
-- TROUVER ET SUPPRIMER LES TRIGGERS PROBLÉMATIQUES
-- ================================================

-- 1. Lister TOUS les triggers sur mission_assignments
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'mission_assignments';

-- 2. Lister les fonctions qui référencent assigned_to_user_id
SELECT 
  p.proname as function_name,
  p.prosrc as function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc ILIKE '%assigned_to_user_id%'
AND n.nspname = 'public';

-- 3. Supprimer tous les triggers sur mission_assignments
DO $$ 
DECLARE 
  trig RECORD;
BEGIN
  FOR trig IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'mission_assignments'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON mission_assignments', trig.trigger_name);
    RAISE NOTICE 'Supprimé trigger: %', trig.trigger_name;
  END LOOP;
END $$;

-- 4. Forcer le refresh
NOTIFY pgrst, 'reload schema';

SELECT '✅ Triggers supprimés sur mission_assignments' as status;
