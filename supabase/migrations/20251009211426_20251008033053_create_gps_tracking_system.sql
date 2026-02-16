/*
  # GPS Tracking System for Real-Time Mission Tracking

  1. New Tables
    - `mission_tracking_positions`
    - `mission_tracking_sessions`
    - `mission_public_links`

  2. Security
    - Enable RLS on all tables
    - Authenticated users can create and view their own tracking data
    - Public access for tracking positions via valid public link
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
  unique_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
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

-- RLS Policies simplified (mission owner and assigned users can access)

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mission_tracking_positions' 
    AND policyname = 'Users can manage tracking positions'
  ) THEN
    CREATE POLICY "Users can manage tracking positions"
      ON mission_tracking_positions FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM missions
          WHERE missions.id = mission_tracking_positions.mission_id
          AND (missions.user_id = auth.uid() OR missions.driver_id = auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM missions
          WHERE missions.id = mission_tracking_positions.mission_id
          AND (missions.user_id = auth.uid() OR missions.driver_id = auth.uid())
        )
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mission_tracking_positions' 
    AND policyname = 'Public can view positions via valid public link'
  ) THEN
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
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mission_tracking_sessions' 
    AND policyname = 'Users can manage tracking sessions'
  ) THEN
    CREATE POLICY "Users can manage tracking sessions"
      ON mission_tracking_sessions FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM missions
          WHERE missions.id = mission_tracking_sessions.mission_id
          AND (missions.user_id = auth.uid() OR missions.driver_id = auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM missions
          WHERE missions.id = mission_tracking_sessions.mission_id
          AND (missions.user_id = auth.uid() OR missions.driver_id = auth.uid())
        )
        AND driver_id = auth.uid()
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mission_tracking_sessions' 
    AND policyname = 'Public can view sessions via valid public link'
  ) THEN
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
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mission_public_links' 
    AND policyname = 'Mission creators can manage public links'
  ) THEN
    CREATE POLICY "Mission creators can manage public links"
      ON mission_public_links FOR ALL
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
        AND created_by = auth.uid()
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mission_public_links' 
    AND policyname = 'Public can view valid public links by token'
  ) THEN
    CREATE POLICY "Public can view valid public links by token"
      ON mission_public_links FOR SELECT
      TO anon
      USING (
        is_active = true
        AND (expires_at IS NULL OR expires_at > now())
      );
  END IF;
END $$;

-- Function to update tracking session stats
CREATE OR REPLACE FUNCTION update_tracking_session_stats()
RETURNS TRIGGER AS $$
BEGIN
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