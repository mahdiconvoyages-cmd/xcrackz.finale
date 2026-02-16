-- Fix MISSIONS table schema inconsistencies
-- Add missing location fields, standardize vehicle fields, add completion tracking

BEGIN;

-- Step 1: Add missing location fields
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS pickup_city TEXT,
  ADD COLUMN IF NOT EXISTS delivery_city TEXT,
  ADD COLUMN IF NOT EXISTS pickup_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS delivery_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS public_tracking_link TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Step 2: Standardize vehicle_plate field
-- Migrate data from vehicle_license_plate if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'vehicle_license_plate'
  ) THEN
    UPDATE missions 
    SET vehicle_plate = vehicle_license_plate 
    WHERE vehicle_plate IS NULL AND vehicle_license_plate IS NOT NULL;
    
    ALTER TABLE missions DROP COLUMN vehicle_license_plate;
  END IF;
END $$;

-- Step 3: Add index for public tracking links
CREATE INDEX IF NOT EXISTS idx_missions_public_tracking_link ON missions(public_tracking_link);

-- Step 4: Add documentation
COMMENT ON COLUMN missions.pickup_city IS 'City of pickup location (extracted from pickup_address)';
COMMENT ON COLUMN missions.delivery_city IS 'City of delivery location (extracted from delivery_address)';
COMMENT ON COLUMN missions.pickup_postal_code IS 'Postal code of pickup location';
COMMENT ON COLUMN missions.delivery_postal_code IS 'Postal code of delivery location';
COMMENT ON COLUMN missions.public_tracking_link IS 'Shareable public tracking URL for this mission';
COMMENT ON COLUMN missions.completed_at IS 'Timestamp when mission was marked as completed';
COMMENT ON COLUMN missions.started_at IS 'Timestamp when mission actually started (first inspection)';

COMMIT;
