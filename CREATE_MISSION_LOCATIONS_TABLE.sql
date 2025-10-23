-- 📍 Table pour stocker l'historique des positions GPS pendant les missions

CREATE TABLE IF NOT EXISTS mission_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  altitude DECIMAL(10, 2),
  speed DECIMAL(10, 2),
  heading DECIMAL(10, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide par mission
CREATE INDEX IF NOT EXISTS idx_mission_locations_mission_id 
  ON mission_locations(mission_id);

-- Index pour recherche par date
CREATE INDEX IF NOT EXISTS idx_mission_locations_recorded_at 
  ON mission_locations(recorded_at DESC);

-- RLS Policies
ALTER TABLE mission_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Voir les positions de ses propres missions ou missions assignées
CREATE POLICY "view_mission_locations" ON mission_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_locations.mission_id
      AND (
        m.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM mission_assignments ma
          WHERE ma.mission_id = m.id
          AND ma.user_id = auth.uid()
        )
      )
    )
  );

-- Policy: Insérer des positions pour ses missions ou missions assignées
CREATE POLICY "insert_mission_locations" ON mission_locations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_locations.mission_id
      AND (
        m.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM mission_assignments ma
          WHERE ma.mission_id = m.id
          AND ma.user_id = auth.uid()
        )
      )
    )
  );

-- Commentaires
COMMENT ON TABLE mission_locations IS 'Historique des positions GPS pendant les missions pour tracking en temps réel';
COMMENT ON COLUMN mission_locations.mission_id IS 'ID de la mission trackée';
COMMENT ON COLUMN mission_locations.latitude IS 'Latitude de la position';
COMMENT ON COLUMN mission_locations.longitude IS 'Longitude de la position';
COMMENT ON COLUMN mission_locations.accuracy IS 'Précision de la position en mètres';
COMMENT ON COLUMN mission_locations.recorded_at IS 'Date/heure d''enregistrement de la position';
