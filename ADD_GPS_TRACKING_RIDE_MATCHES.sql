-- ============================================================
-- Add GPS tracking columns to ride_matches for in_transit
-- Run in Supabase SQL Editor
-- ============================================================

-- Driver live position (updated every 15-30s during in_transit)
ALTER TABLE ride_matches ADD COLUMN IF NOT EXISTS driver_lat double precision;
ALTER TABLE ride_matches ADD COLUMN IF NOT EXISTS driver_lng double precision;
ALTER TABLE ride_matches ADD COLUMN IF NOT EXISTS driver_location_updated_at timestamptz;

-- ETA en minutes (calculé côté client, stocké pour le passager)
ALTER TABLE ride_matches ADD COLUMN IF NOT EXISTS eta_minutes integer;

-- Timestamps du trajet
ALTER TABLE ride_matches ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE ride_matches ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Enable Realtime on ride_matches for live tracking
-- (skip if already member of supabase_realtime)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ride_matches;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index pour les matchs in_transit actifs
CREATE INDEX IF NOT EXISTS idx_ride_matches_in_transit 
ON ride_matches (driver_id, status) 
WHERE status = 'in_transit';
