-- ================================================================
-- SMS Phone Verification System
-- Table: phone_verifications
-- Stores OTP codes for phone number verification during signup
-- ================================================================

-- 1) Create the phone_verifications table
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone 
  ON phone_verifications(phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires 
  ON phone_verifications(expires_at) 
  WHERE verified = FALSE;

-- 3) RLS — only Edge Functions (service_role) can access this table
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access on phone_verifications" ON phone_verifications;

-- Allow service_role (Edge Functions) full access
CREATE POLICY "Service role full access on phone_verifications"
  ON phone_verifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Revoke direct access from anon/authenticated — only service_role via Edge Functions
REVOKE ALL ON phone_verifications FROM anon;
REVOKE ALL ON phone_verifications FROM authenticated;
GRANT ALL ON phone_verifications TO service_role;

-- 4) Add phone_verified column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 5) Auto-cleanup expired verifications (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_expired_phone_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_verifications 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) Enable realtime for the table (optional, for admin monitoring)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'phone_verifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE phone_verifications;
  END IF;
END $$;

-- ================================================================
-- DONE — Run this in Supabase SQL Editor
-- Then set the Bird API key as a secret:
--   supabase secrets set BIRD_API_KEY=zxNnkLmPRVh53iZSCzqtZhXZ6uehobXxeTwd
-- Then deploy the Edge Function:
--   supabase functions deploy verify-phone
-- ================================================================
