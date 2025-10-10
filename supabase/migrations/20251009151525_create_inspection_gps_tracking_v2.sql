/*
  # Système d'inspection et de suivi GPS en temps réel

  ## Description
  Système complet d'inspection type Weproov avec suivi GPS en temps réel
  pour les missions de transport.

  ## Workflow
  1. Inspection départ (photos + état des lieux)
  2. GPS temps réel activé → Navigation vers destination
  3. Inspection arrivée (photos + état des lieux)
  4. Génération rapport PDF

  ## Tables créées
  - vehicle_inspections: Inspections départ/arrivée
  - inspection_photos: Photos avec annotations
  - gps_tracking_sessions: Sessions de suivi
  - gps_location_points: Points GPS temps réel
*/

-- ============================================================================
-- 1. VEHICLE_INSPECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE NOT NULL,
  inspector_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  inspection_type text NOT NULL,
  vehicle_info jsonb DEFAULT '{}',
  overall_condition text,
  fuel_level integer,
  mileage_km integer,
  damages jsonb DEFAULT '[]',
  notes text,
  inspector_signature text,
  client_signature text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  location_address text,
  status text DEFAULT 'in_progress',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_insp_mission ON vehicle_inspections(mission_id);
CREATE INDEX idx_insp_type ON vehicle_inspections(inspection_type);

ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY insp_owner_policy ON vehicle_inspections
  FOR ALL TO authenticated
  USING (
    inspector_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = vehicle_inspections.mission_id
      AND m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. INSPECTION_PHOTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES vehicle_inspections(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  photo_type text NOT NULL,
  description text,
  annotations jsonb DEFAULT '[]',
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  taken_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_photos_inspection ON inspection_photos(inspection_id);

ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY photos_policy ON inspection_photos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicle_inspections vi
      JOIN missions m ON m.id = vi.mission_id
      WHERE vi.id = inspection_photos.inspection_id
      AND (vi.inspector_id = auth.uid() OR m.user_id = auth.uid())
    )
  );

-- ============================================================================
-- 3. GPS_TRACKING_SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS gps_tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  departure_inspection_id uuid REFERENCES vehicle_inspections(id) ON DELETE SET NULL,
  arrival_inspection_id uuid REFERENCES vehicle_inspections(id) ON DELETE SET NULL,
  start_latitude decimal(10, 8),
  start_longitude decimal(11, 8),
  start_address text,
  end_latitude decimal(10, 8),
  end_longitude decimal(11, 8),
  end_address text,
  total_distance_km decimal(10, 2),
  total_duration_minutes integer,
  average_speed_kmh decimal(5, 2),
  max_speed_kmh decimal(5, 2),
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_track_mission ON gps_tracking_sessions(mission_id);
CREATE INDEX idx_track_driver ON gps_tracking_sessions(driver_id);

ALTER TABLE gps_tracking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY track_driver_policy ON gps_tracking_sessions
  FOR ALL TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY track_client_view ON gps_tracking_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = gps_tracking_sessions.mission_id
      AND m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. GPS_LOCATION_POINTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS gps_location_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES gps_tracking_sessions(id) ON DELETE CASCADE NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  altitude decimal(8, 2),
  accuracy decimal(8, 2),
  speed_kmh decimal(5, 2),
  heading decimal(5, 2),
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_loc_session ON gps_location_points(session_id);
CREATE INDEX idx_loc_time ON gps_location_points(recorded_at);
CREATE INDEX idx_loc_session_time ON gps_location_points(session_id, recorded_at);

ALTER TABLE gps_location_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY loc_insert_policy ON gps_location_points
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gps_tracking_sessions ts
      WHERE ts.id = gps_location_points.session_id
      AND ts.driver_id = auth.uid()
    )
  );

CREATE POLICY loc_view_policy ON gps_location_points
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gps_tracking_sessions ts
      JOIN missions m ON m.id = ts.mission_id
      WHERE ts.id = gps_location_points.session_id
      AND (ts.driver_id = auth.uid() OR m.user_id = auth.uid())
    )
  );

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_insp_updated
  BEFORE UPDATE ON vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_track_updated
  BEFORE UPDATE ON gps_tracking_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();