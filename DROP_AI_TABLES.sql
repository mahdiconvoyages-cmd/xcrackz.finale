-- ============================================================
-- DROP AI-RELATED TABLES - Clara / DeepSeek Cleanup
-- ============================================================
-- Execute in Supabase SQL Editor
-- These tables were used by Clara AI which has been replaced by Support
-- ============================================================

-- AI conversation/message tables
DROP TABLE IF EXISTS public.ai_messages CASCADE;
DROP TABLE IF EXISTS public.ai_conversations CASCADE;
DROP TABLE IF EXISTS public.ai_insights CASCADE;
DROP TABLE IF EXISTS public.ai_requests_usage CASCADE;
DROP TABLE IF EXISTS public.user_ai_memory CASCADE;

-- ============================================================
-- TOTAL: 5 AI tables to drop
-- ============================================================
