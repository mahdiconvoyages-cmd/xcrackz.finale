/*
  # GPS Tracking System for Real-Time Mission Tracking

  1. New Tables
    - `mission_tracking_positions`
      - `id` (uuid, primary key)
      - `mission_id` (uuid, foreign key to missions)
      - `latitude` (double precision)
      - `longitude` (double precision)
      - `speed` (double precision) - in km/h
      - `heading` (double precision) - direction in degrees
      - `accuracy` (double precision) - GPS accuracy in meters
      - `altitude` (double precision) - altitude in meters
      - `recorded_at` (timestamptz) - when position was recorded
      - `created_at` (timestamptz)

    - `mission_tracking_sessions`
      - `id` (uuid, primary key)
      - `mission_id` (uuid, foreign key to missions)
      - `driver_id` (uuid, foreign key to profiles)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz)
      - `total_distance` (double precision) - in km
      - `max_speed` (double precision) - in km/h
      - `average_speed` (double precision) - in km/h
      - `status` (text) - active, paused, completed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `mission_public_links`
      - `id` (uuid, primary key)
      - `mission_id` (uuid, foreign key to missions)
      - `unique_token` (text, unique) - public sharing token
      - `expires_at` (timestamptz) - optional expiration
      - `is_active` (boolean) - can be deactivated
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can create and view their own tracking data
    - Public access for tracking positions via valid public link
    - Only mission owners can create public links
    
  3. Indexes
    - Index on mission_id for fast position lookups
    - Index on recorded_at for time-based queries
    - Index on unique_token for public link access
*/

-- Mission GPS Positions Table
CREATE TABLE IF NOT EXISTS mission_tracking_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed double precision DEFAULT 0,
  heading double precision DEFAULT 0,
  accuracy double precision DEFAULT 0,
  altitude double precision DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Mission Tracking Sessions Table
CREATE TABLE IF NOT EXISTS mission_tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  total_distance double precision DEFAULT 0,
  max_speed double precision DEFAULT 0,
  average_speed double precision DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mission Public Links Table
CREATE TABLE IF NOT EXISTS mission_public_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  unique_token text UNIQUE NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'base64'),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracking_positions_mission_id ON mission_tracking_positions(mission_id);
CREATE INDEX IF NOT EXISTS idx_tracking_positions_recorded_at ON mission_tracking_positions(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_mission_id ON mission_tracking_sessions(mission_id);
CREATE INDEX IF NOT EXISTS idx_public_links_token ON mission_public_links(unique_token);
CREATE INDEX IF NOT EXISTS idx_public_links_mission_id ON mission_public_links(mission_id);

-- Enable Row Level Security
ALTER TABLE mission_tracking_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_public_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mission_tracking_positions

-- Authenticated users can insert positions for missions they're assigned to as driver
CREATE POLICY "Drivers can insert tracking positions"
  ON mission_tracking_positions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_tracking_positions.mission_id
      AND missions.driver_id = auth.uid()
    )
  );

-- Authenticated users can view positions for their missions (owner or driver)
CREATE POLICY "Users can view tracking positions for their missions"
  ON mission_tracking_positions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_tracking_positions.mission_id
      AND (missions.user_id = auth.uid() OR missions.driver_id = auth.uid())
    )
  );

-- Public can view positions for missions with valid active public links
CREATE POLICY "Public can view positions via valid public link"
  ON mission_tracking_positions FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM mission_public_links
      WHERE mission_public_links.mission_id = mission_tracking_positions.mission_id
      AND mission_public_links.is_active = true
      AND (mission_public_links.expires_at IS NULL OR mission_public_links.expires_at > now())
    )
  );

-- RLS Policies for mission_tracking_sessions

-- Drivers can create tracking sessions for assigned missions
CREATE POLICY "Drivers can create tracking sessions"
  ON mission_tracking_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_tracking_sessions.mission_id
      AND missions.driver_id = auth.uid()
    )
    AND driver_id = auth.uid()
  );

-- Users can view sessions for their missions (owner or driver)
CREATE POLICY "Users can view tracking sessions for their missions"
  ON mission_tracking_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_tracking_sessions.mission_id
      AND (missions.user_id = auth.uid() OR missions.driver_id = auth.uid())
    )
  );

-- Drivers can update their own sessions
CREATE POLICY "Drivers can update their tracking sessions"
  ON mission_tracking_sessions FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Public can view sessions via valid public link
CREATE POLICY "Public can view sessions via valid public link"
  ON mission_tracking_sessions FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM mission_public_links
      WHERE mission_public_links.mission_id = mission_tracking_sessions.mission_id
      AND mission_public_links.is_active = true
      AND (mission_public_links.expires_at IS NULL OR mission_public_links.expires_at > now())
    )
  );

-- RLS Policies for mission_public_links

-- Mission creators can create public links
CREATE POLICY "Mission creators can create public links"
  ON mission_public_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_public_links.mission_id
      AND missions.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Mission creators can view their public links
CREATE POLICY "Mission creators can view their public links"
  ON mission_public_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_public_links.mission_id
      AND missions.user_id = auth.uid()
    )
  );

-- Mission creators can update their public links
CREATE POLICY "Mission creators can update their public links"
  ON mission_public_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_public_links.mission_id
      AND missions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_public_links.mission_id
      AND missions.user_id = auth.uid()
    )
  );

-- Public can view active, non-expired links by token
CREATE POLICY "Public can view valid public links by token"
  ON mission_public_links FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Function to update tracking session stats
CREATE OR REPLACE FUNCTION update_tracking_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the session with latest stats
  UPDATE mission_tracking_sessions
  SET
    max_speed = GREATEST(max_speed, NEW.speed),
    updated_at = now()
  WHERE mission_id = NEW.mission_id
    AND status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session stats on new position
DROP TRIGGER IF EXISTS trigger_update_session_stats ON mission_tracking_positions;
CREATE TRIGGER trigger_update_session_stats
  AFTER INSERT ON mission_tracking_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_session_stats();