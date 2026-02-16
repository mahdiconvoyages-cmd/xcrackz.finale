-- Fix VEHICLE_INSPECTIONS table schema and critical type mismatches
-- Fix fuel_level type consistency and add missing fields

BEGIN;

-- Step 1: Ensure fuel_level is always numeric for consistency
-- This is a CRITICAL fix - fuel_level should be numeric, not string
ALTER TABLE vehicle_inspections
  ADD COLUMN IF NOT EXISTS fuel_level_numeric NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS fuel_level_percentage INTEGER;

-- Step 2: Migrate existing fuel_level string values to numeric
-- Handle common fuel level indicators: "E" (empty), "1/4", "1/2", "3/4", "F" (full)
UPDATE vehicle_inspections 
SET fuel_level_percentage = 
  CASE 
    WHEN fuel_level = 'E' THEN 0
    WHEN fuel_level = '1/4' THEN 25
    WHEN fuel_level = '1/2' THEN 50
    WHEN fuel_level = '3/4' THEN 75
    WHEN fuel_level = 'F' THEN 100
    WHEN fuel_level IS NULL THEN NULL
    ELSE 50 -- Default to half if unclear
  END
WHERE fuel_level_percentage IS NULL;

-- Step 3: Add missing inspection fields for consistency
ALTER TABLE vehicle_inspections
  ADD COLUMN IF NOT EXISTS mileage_km_start INTEGER,
  ADD COLUMN IF NOT EXISTS mileage_km_end INTEGER,
  ADD COLUMN IF NOT EXISTS odometer_km INTEGER, -- For consistency with fuel_level_numeric
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_driver_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_client_url TEXT;

-- Step 4: Migrate existing data if fields already exist with different names
-- Copy data from general signature fields if specific ones don't have data
UPDATE vehicle_inspections 
SET signature_driver_url = driver_signature 
WHERE signature_driver_url IS NULL AND driver_signature IS NOT NULL;

UPDATE vehicle_inspections 
SET signature_client_url = client_signature 
WHERE signature_client_url IS NULL AND client_signature IS NOT NULL;

-- Step 5: Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_fuel_level_percentage 
  ON vehicle_inspections(fuel_level_percentage);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_mileage_km 
  ON vehicle_inspections(mileage_km);

-- Step 6: Add documentation
COMMENT ON COLUMN vehicle_inspections.fuel_level_numeric IS 'Numeric fuel level (liters) - preferred over fuel_level string';
COMMENT ON COLUMN vehicle_inspections.fuel_level_percentage IS 'Fuel level as percentage (0-100) for consistency';
COMMENT ON COLUMN vehicle_inspections.mileage_km_start IS 'Odometer reading at start of journey';
COMMENT ON COLUMN vehicle_inspections.mileage_km_end IS 'Odometer reading at end of journey';
COMMENT ON COLUMN vehicle_inspections.odometer_km IS 'Current odometer reading (primary field for mileage)';
COMMENT ON COLUMN vehicle_inspections.started_at IS 'When the inspection process was started';
COMMENT ON COLUMN vehicle_inspections.signature_driver_url IS 'URL to driver signature image';
COMMENT ON COLUMN vehicle_inspections.signature_client_url IS 'URL to client signature image';

COMMIT;
