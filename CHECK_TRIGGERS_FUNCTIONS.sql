-- ============================================
-- VÉRIFIER TOUS LES TRIGGERS ET FONCTIONS
-- ============================================

-- 1. Triggers sur vehicle_inspections
SELECT 
  '🔔 Triggers sur vehicle_inspections' as info,
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'vehicle_inspections'
ORDER BY trigger_name;

-- 2. Triggers sur inspection_photos_v2
SELECT 
  '🔔 Triggers sur inspection_photos_v2' as info,
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'inspection_photos_v2'
ORDER BY trigger_name;

-- 3. Fonctions qui référencent inspection_id
SELECT 
  '⚙️ Fonctions avec inspection_id' as info,
  p.proname as function_name,
  LEFT(pg_get_functiondef(p.oid), 500) as definition_preview
FROM pg_proc p
WHERE pg_get_functiondef(p.oid) ILIKE '%inspection_id%'
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND p.prokind = 'f' -- Seulement les fonctions normales (pas aggregates)
ORDER BY p.proname;
