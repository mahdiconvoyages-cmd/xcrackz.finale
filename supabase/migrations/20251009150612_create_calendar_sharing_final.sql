/*
  # Système de partage de planning/calendrier

  ## Description
  Permet aux utilisateurs de partager leur planning avec d'autres contacts.
  Les contacts peuvent voir et créer des événements dans le planning partagé.

  ## Tables créées
  
  ### 1. `calendar_permissions` - Autorisations de partage
  ### 2. `calendar_events` - Événements du calendrier
  ### 3. `calendar_event_participants` - Participants aux événements
*/

-- Table 1: Permissions de calendrier
CREATE TABLE calendar_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'view',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_permissions_unique UNIQUE (owner_id, shared_with_id)
);

CREATE INDEX idx_cal_perm_owner ON calendar_permissions(owner_id);
CREATE INDEX idx_cal_perm_shared ON calendar_permissions(shared_with_id);

ALTER TABLE calendar_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cal_perm_owner_all ON calendar_permissions
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY cal_perm_shared_view ON calendar_permissions
  FOR SELECT TO authenticated
  USING (auth.uid() = shared_with_id);

-- Table 2: Événements de calendrier
CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'other',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  is_all_day boolean NOT NULL DEFAULT false,
  reminder_minutes integer DEFAULT 15,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cal_evt_owner ON calendar_events(owner_id);
CREATE INDEX idx_cal_evt_start ON calendar_events(start_time);
CREATE INDEX idx_cal_evt_end ON calendar_events(end_time);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY cal_evt_owner_all ON calendar_events
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY cal_evt_shared_view ON calendar_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_permissions
      WHERE calendar_permissions.owner_id = calendar_events.owner_id
      AND calendar_permissions.shared_with_id = auth.uid()
      AND calendar_permissions.is_active = true
    )
  );

CREATE POLICY cal_evt_shared_insert ON calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_permissions
      WHERE calendar_permissions.owner_id = calendar_events.owner_id
      AND calendar_permissions.shared_with_id = auth.uid()
      AND calendar_permissions.is_active = true
      AND calendar_permissions.permission_level IN ('edit', 'full')
    )
  );

CREATE POLICY cal_evt_shared_update ON calendar_events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_permissions
      WHERE calendar_permissions.owner_id = calendar_events.owner_id
      AND calendar_permissions.shared_with_id = auth.uid()
      AND calendar_permissions.is_active = true
      AND calendar_permissions.permission_level IN ('edit', 'full')
    )
  );

CREATE POLICY cal_evt_shared_delete ON calendar_events
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_permissions
      WHERE calendar_permissions.owner_id = calendar_events.owner_id
      AND calendar_permissions.shared_with_id = auth.uid()
      AND calendar_permissions.is_active = true
      AND calendar_permissions.permission_level = 'full'
    )
  );

-- Table 3: Participants aux événements
CREATE TABLE calendar_event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  response_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cal_part_event ON calendar_event_participants(event_id);

ALTER TABLE calendar_event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY cal_part_view ON calendar_event_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = calendar_event_participants.event_id
      AND (
        calendar_events.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM calendar_permissions
          WHERE calendar_permissions.owner_id = calendar_events.owner_id
          AND calendar_permissions.shared_with_id = auth.uid()
          AND calendar_permissions.is_active = true
        )
      )
    )
  );

CREATE POLICY cal_part_manage ON calendar_event_participants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = calendar_event_participants.event_id
      AND (calendar_events.owner_id = auth.uid() OR calendar_events.created_by_id = auth.uid())
    )
  );

-- Triggers
CREATE TRIGGER trg_cal_perm_updated
  BEFORE UPDATE ON calendar_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cal_evt_updated
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();