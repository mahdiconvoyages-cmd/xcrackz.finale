-- Add pickup/delivery location name columns to missions table
-- These fields store a descriptive name for each location
-- e.g. "Renault Montreuil", "Garage Central Paris"

ALTER TABLE missions ADD COLUMN IF NOT EXISTS pickup_location_name TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS delivery_location_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN missions.pickup_location_name IS 'Descriptive name of the pickup location (e.g. Renault Montreuil)';
COMMENT ON COLUMN missions.delivery_location_name IS 'Descriptive name of the delivery location (e.g. Garage Central Paris)';
