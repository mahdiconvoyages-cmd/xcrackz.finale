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

-- Remove 17 tables from realtime publication (one by one for PG15 compatibility)
ALTER PUBLICATION supabase_realtime DROP TABLE public.account_creation_attempts;
ALTER PUBLICATION supabase_realtime DROP TABLE public.calendar_permissions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.carpooling_bookings;
ALTER PUBLICATION supabase_realtime DROP TABLE public.carpooling_trips;
ALTER PUBLICATION supabase_realtime DROP TABLE public.gps_location_points;
ALTER PUBLICATION supabase_realtime DROP TABLE public.gps_tracking_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.inspection_documents;
ALTER PUBLICATION supabase_realtime DROP TABLE public.inspection_expenses;
ALTER PUBLICATION supabase_realtime DROP TABLE public.inspection_pdfs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.inspection_photos_v2;
ALTER PUBLICATION supabase_realtime DROP TABLE public.inspection_report_shares;
ALTER PUBLICATION supabase_realtime DROP TABLE public.inspections;
ALTER PUBLICATION supabase_realtime DROP TABLE public.invoice_items;
ALTER PUBLICATION supabase_realtime DROP TABLE public.mission_locations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.mission_tracking_history;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_push_tokens;
ALTER PUBLICATION supabase_realtime DROP TABLE public.vehicle_inspections;

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
