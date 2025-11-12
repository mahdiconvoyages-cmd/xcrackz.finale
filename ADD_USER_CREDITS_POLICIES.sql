-- ================================================
-- Migration: ADD_USER_CREDITS_POLICIES.sql
-- Purpose: Allow authenticated users to create and update their own
--          user_credits row (currently only SELECT allowed → 403 on INSERT).
-- ================================================

-- Enable RLS (idempotent)
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplicates
DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

-- Existing view policy is assumed: "Users can view own credits"
-- Add missing insert/update policies
CREATE POLICY "Users can insert own credits" ON public.user_credits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON public.user_credits
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Optional: Delete policy (if users should be able to reset)
-- DROP POLICY IF EXISTS "Users can delete own credits" ON public.user_credits;
-- CREATE POLICY "Users can delete own credits" ON public.user_credits
--   FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Verification queries (run manually after applying):
-- SELECT * FROM public.user_credits LIMIT 1;
-- Attempt an insert from client: should succeed now.
