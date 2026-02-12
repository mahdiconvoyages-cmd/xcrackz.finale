-- ============================================================
-- OPTIMIZE REALTIME - Reduce Supabase realtime costs
-- ============================================================
-- Execute in Supabase SQL Editor
-- ============================================================

-- 1. Remove REPLICA IDENTITY FULL from 4 tables
-- FULL sends the complete OLD + NEW row on every update (doubles payload)
-- DEFAULT only sends the PRIMARY KEY for OLD row (sufficient for our use case)
-- ============================================================
ALTER TABLE public.missions REPLICA IDENTITY DEFAULT;
ALTER TABLE public.vehicle_inspections REPLICA IDENTITY DEFAULT;
ALTER TABLE public.support_conversations REPLICA IDENTITY DEFAULT;
ALTER TABLE public.support_messages REPLICA IDENTITY DEFAULT;

-- 2. Disable realtime on high-frequency tables that don't need it
-- inspection_photos_v2: photos are uploaded in batch, no realtime needed
-- mission_locations: GPS positions are polled, no realtime needed  
-- gps_location_points: same - GPS data is polled
-- inspection_documents: documents uploaded in batch
-- ============================================================

-- Check which tables have realtime enabled and remove the ones that don't need it
-- Note: In Supabase, realtime is controlled via the supabase_realtime publication
-- To remove a table from realtime:

DO $$
DECLARE
  tables_to_remove TEXT[] := ARRAY[
    'inspection_photos_v2',
    'mission_locations', 
    'gps_location_points',
    'inspection_documents',
    'inspection_damages',
    'inspection_expenses',
    'mission_tracking_history',
    'ai_messages',
    'ai_insights',
    'ai_requests_usage',
    'credit_transactions',
    'navigation_sessions',
    'calendar_events',
    'calendar_permissions',
    'availability_calendar'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_remove LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.%I', t);
      RAISE NOTICE 'Removed % from realtime', t;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Table % not in publication (already removed or not added)', t;
    END;
  END LOOP;
END $$;

-- 3. Keep realtime ONLY on essential tables:
-- ✅ missions (status updates, assignments)
-- ✅ profiles (user info changes)
-- ✅ support_conversations (chat)
-- ✅ support_messages (chat messages)
-- ✅ notifications (push notifications)
-- ✅ mission_tracking_live (live GPS position)
-- ✅ user_credits (credit balance changes)
-- ✅ subscriptions (plan changes)
-- ✅ mission_assignments (mission joins)
-- ============================================================

-- Verify current realtime tables:
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
