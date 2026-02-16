-- ============================================================
-- DROP UNUSED TABLES - ChecksFleet Database Cleanup
-- ============================================================
-- Generated after full audit of 115 tables vs source code usage
-- (src/, mobile_flutter/, supabase/functions/)
-- 
-- ⚠️  BACKUP YOUR DATABASE BEFORE EXECUTING THIS SCRIPT
-- ⚠️  Execute in Supabase SQL Editor
-- ⚠️  Tables with CASCADE will also drop dependent objects (triggers, policies, indexes)
-- ============================================================

-- ============================================================
-- 1. CARPOOLING LEGACY TABLES (unused duplicates/old system)
-- These are from old carpooling implementations that were replaced
-- ============================================================
DROP TABLE IF EXISTS public.carpooling_ratings CASCADE;
DROP TABLE IF EXISTS public.carpooling_reviews CASCADE;
DROP TABLE IF EXISTS public.carpooling_rides CASCADE;
DROP TABLE IF EXISTS public.carpooling_rides_pro CASCADE;
DROP TABLE IF EXISTS public.carpooling_user_preferences CASCADE;
DROP TABLE IF EXISTS public.covoiturage_bookings CASCADE;
DROP TABLE IF EXISTS public.covoiturage_driver_profiles CASCADE;
DROP TABLE IF EXISTS public.covoiturage_messages CASCADE;
DROP TABLE IF EXISTS public.covoiturage_ratings CASCADE;
DROP TABLE IF EXISTS public.covoiturage_reviews CASCADE;

-- ============================================================
-- 2. RIDE SYSTEM TABLES (never implemented in production)
-- ============================================================
DROP TABLE IF EXISTS public.ride_bookings_pro CASCADE;
DROP TABLE IF EXISTS public.ride_conversations CASCADE;
DROP TABLE IF EXISTS public.ride_disputes CASCADE;
DROP TABLE IF EXISTS public.ride_messages CASCADE;
DROP TABLE IF EXISTS public.ride_reviews CASCADE;
DROP TABLE IF EXISTS public.recurring_ride_templates CASCADE;

-- ============================================================
-- 3. DRIVER SYSTEM TABLES (never used in actual code)
-- ============================================================
DROP TABLE IF EXISTS public.driver_availability CASCADE;
DROP TABLE IF EXISTS public.driver_mission_history CASCADE;
DROP TABLE IF EXISTS public.driver_profiles CASCADE;
DROP TABLE IF EXISTS public.driver_statistics CASCADE;
DROP TABLE IF EXISTS public.driver_teams CASCADE;
DROP TABLE IF EXISTS public.driving_reports CASCADE;

-- ============================================================
-- 4. INSPECTION LEGACY TABLES (replaced by inspection_photos_v2 / vehicle_inspections)
-- ============================================================
DROP TABLE IF EXISTS public.inspection_defects CASCADE;
DROP TABLE IF EXISTS public.inspection_items CASCADE;
DROP TABLE IF EXISTS public.inspection_offline_queue CASCADE;
DROP TABLE IF EXISTS public.inspection_photos_backup CASCADE;
DROP TABLE IF EXISTS public.inspection_photos_old CASCADE;

-- ============================================================
-- 5. MISSION TRACKING DUPLICATES (replaced by mission_tracking_live + mission_tracking_history)
-- ============================================================
DROP TABLE IF EXISTS public.mission_public_links CASCADE;
DROP TABLE IF EXISTS public.mission_tracking CASCADE;
DROP TABLE IF EXISTS public.mission_tracking_positions CASCADE;
DROP TABLE IF EXISTS public.mission_tracking_sessions CASCADE;
DROP TABLE IF EXISTS public.tracking_positions CASCADE;

-- ============================================================
-- 6. ADMIN / SECURITY UNUSED TABLES
-- ============================================================
DROP TABLE IF EXISTS public.admin_status_audit CASCADE;
DROP TABLE IF EXISTS public.alert_votes CASCADE;
DROP TABLE IF EXISTS public.data_access_logs CASCADE;
DROP TABLE IF EXISTS public.fraud_detection_logs CASCADE;
DROP TABLE IF EXISTS public.identity_verifications CASCADE;
DROP TABLE IF EXISTS public.signup_blacklist CASCADE;

-- ============================================================
-- 7. SUBSCRIPTION / CREDITS UNUSED TABLES
-- ============================================================
DROP TABLE IF EXISTS public.credit_usage_log CASCADE;
DROP TABLE IF EXISTS public.credits_packages CASCADE;
DROP TABLE IF EXISTS public.subscription_benefits CASCADE;
DROP TABLE IF EXISTS public.subscription_history CASCADE;
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.feature_costs CASCADE;

-- ============================================================
-- 8. NOTIFICATION / EMAIL UNUSED TABLES
-- ============================================================
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.notification_logs CASCADE;
DROP TABLE IF EXISTS public.user_notifications CASCADE;

-- ============================================================
-- 9. SOCIAL / COMMUNITY UNUSED TABLES
-- ============================================================
DROP TABLE IF EXISTS public.calendar_event_participants CASCADE;
DROP TABLE IF EXISTS public.team_invitations CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.user_favorites CASCADE;

-- ============================================================
-- 10. GPS UNUSED TABLE
-- ============================================================
DROP TABLE IF EXISTS public.gps_stop_zones CASCADE;

-- ============================================================
-- 11. SUPPORT UNUSED TABLE
-- ============================================================
DROP TABLE IF EXISTS public.support_auto_responses CASCADE;

-- ============================================================
-- TOTAL: 51 tables to drop
-- ============================================================
-- 
-- TABLES KEPT (64 tables used in production code):
-- ✅ account_creation_attempts  ✅ ai_conversations        ✅ ai_insights
-- ✅ ai_messages                ✅ ai_requests_usage       ✅ app_versions
-- ✅ attachments                ✅ availability_calendar   ✅ calendar_events
-- ✅ calendar_permissions       ✅ carpooling_bookings     ✅ carpooling_messages
-- ✅ carpooling_trips           ✅ clients                 ✅ contact_requests
-- ✅ contacts                   ✅ covoiturage_trips       ✅ credit_transactions
-- ✅ deletion_requests          ✅ documents               ✅ gps_location_points
-- ✅ gps_tracking_sessions      ✅ inspection_damages      ✅ inspection_documents
-- ✅ inspection_expenses        ✅ inspection_pdfs         ✅ inspection_photos_v2
-- ✅ inspection_report_shares   ✅ inspections             ✅ invoice_items
-- ✅ invoices                   ✅ mission_assignments     ✅ mission_locations
-- ✅ mission_revenue_logs       ✅ mission_tracking_history✅ mission_tracking_live
-- ✅ missions                   ✅ navigation_sessions     ✅ notifications
-- ✅ pricing_grids              ✅ profiles                ✅ public_inspection_reports
-- ✅ public_tracking_links      ✅ quote_items             ✅ quotes
-- ✅ shop_items                 ✅ shop_quote_requests     ✅ signup_attempts
-- ✅ subscriptions              ✅ support_conversations   ✅ support_messages
-- ✅ support_tickets            ✅ suspicious_accounts     ✅ transactions
-- ✅ unified_scanned_documents  ✅ user_ai_memory          ✅ user_consents
-- ✅ user_credits               ✅ user_devices            ✅ user_push_tokens
-- ✅ vehicle_inspections
-- 
-- ⛔ spatial_ref_sys (PostGIS system table — NEVER drop)
-- ============================================================
