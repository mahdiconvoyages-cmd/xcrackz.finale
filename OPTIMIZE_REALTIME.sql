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
  -- 17 tables currently in realtime publication but NOT watched by any channel
  tables_to_remove TEXT[] := ARRAY[
    'account_creation_attempts',
    'calendar_permissions',
    'carpooling_bookings',
    'carpooling_trips',
    'gps_location_points',
    'gps_tracking_sessions',
    'inspection_documents',
    'inspection_expenses',
    'inspection_pdfs',
    'inspection_photos_v2',
    'inspection_report_shares',
    'inspections',
    'invoice_items',
    'mission_locations',
    'mission_tracking_history',
    'user_push_tokens',
    'vehicle_inspections'
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

-- 3. Keep realtime ONLY on 9 tables actually watched by channels:
-- ✅ missions          — Dashboard, DashboardPremium, AdminDashboard, AdminTracking
-- ✅ invoices           — Dashboard, DashboardPremium (filtered by user_id)
-- ✅ contacts           — Dashboard (filtered by user_id)
-- ✅ profiles           — DashboardPremium, AdminDashboard, AdminUsers
-- ✅ support_conversations — SupportChat, AdminLayout, AdminSupport
-- ✅ support_messages   — SupportChat, AdminSupport
-- ✅ mission_tracking_live — TrackingCommand, PublicTracking (live GPS)
-- ✅ mission_assignments — useRealtimeSync (mission joins)
-- ✅ user_credits       — Dashboard (filtered by user_id)
-- ============================================================

-- Verify current realtime tables:
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
