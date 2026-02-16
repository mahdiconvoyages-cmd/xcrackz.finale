-- Migration: Add billing_meta JSONB column to profiles table
-- This stores billing profile information (address, IBAN, TVA, etc.)
-- Required for the new BillingProfile page

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS billing_meta JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.billing_meta IS 'Billing profile metadata: billing_address, billing_postal_code, billing_city, billing_email, iban, tva_number, payment_terms, company_logo_url, billing_profile_complete';

-- Create index for fast lookup of complete billing profiles
CREATE INDEX IF NOT EXISTS idx_profiles_billing_complete 
ON profiles ((billing_meta->>'billing_profile_complete'));
