-- ============================================================
-- Execute ALL database fixes in correct order
-- ============================================================
-- Run this script to fix all schema inconsistencies
-- Date: February 5, 2026
-- ============================================================

-- Phase 1: Critical Type Fixes
\i supabase/migrations/20250205_fix_vehicle_inspections_schema.sql

-- Phase 2: Invoices & Quotes Relationships
\i supabase/migrations/20250205_fix_invoices_schema.sql
\i supabase/migrations/20250205_fix_quotes_schema.sql

-- Phase 3: Missions Location & Tracking
\i supabase/migrations/20250205_fix_missions_schema.sql

-- ============================================================
-- Verification Queries
-- ============================================================

-- Check new columns were added
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('invoices', 'quotes', 'missions', 'vehicle_inspections')
  AND column_name IN (
    'client_id', 'mission_id', 'payment_method', 'paid_at', 'sent_at',
    'pickup_city', 'public_tracking_link', 'completed_at',
    'fuel_level_percentage', 'odometer_km'
  )
ORDER BY table_name, column_name;

-- Check indexes were created
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN ('invoices', 'quotes', 'missions', 'vehicle_inspections')
ORDER BY tablename, indexname;
