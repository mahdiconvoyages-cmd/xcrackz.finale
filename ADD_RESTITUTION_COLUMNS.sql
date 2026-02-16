-- ============================================================
-- ADD RESTITUTION COLUMNS TO MISSIONS TABLE
-- 
-- Feature: When creating a mission, the user can toggle
-- "Add a restitution" (return trip). Cost = 2 credits vs 1.
-- ============================================================

-- Flag indicating if this mission includes a restitution (return trip)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS has_restitution BOOLEAN DEFAULT FALSE;

-- Restitution pickup (departure of return trip)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_pickup_address TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_pickup_city TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_pickup_postal_code TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_pickup_lat DOUBLE PRECISION;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_pickup_lng DOUBLE PRECISION;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_pickup_date TIMESTAMPTZ;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_pickup_contact_name TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_pickup_contact_phone TEXT;

-- Restitution delivery (arrival of return trip)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_delivery_address TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_delivery_city TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_delivery_postal_code TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_delivery_lat DOUBLE PRECISION;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_delivery_lng DOUBLE PRECISION;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_delivery_date TIMESTAMPTZ;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_delivery_contact_name TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_delivery_contact_phone TEXT;

-- Restitution vehicle info (may differ from the main vehicle)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_vehicle_brand TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_vehicle_model TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS restitution_vehicle_plate TEXT;

-- ============================================================
-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- Project: bfrkthzovwpjrvqktdjn.supabase.co
-- ============================================================
