/*
  # Système de recommandation de chauffeurs

  ## Description
  Cette migration ajoute les fonctionnalités nécessaires pour le système de recommandation
  intelligent de chauffeurs basé sur la proximité, disponibilité, permis et historique.

  ## Modifications apportées
  
  ### 1. Table `contacts` - Nouveaux champs
  Ajout de colonnes pour gérer les chauffeurs:
  - `is_driver` (boolean) - Indique si le contact est un chauffeur
  - `driver_licenses` (text[]) - Liste des permis de conduire (B, C, D, CE, etc.)
  - `current_latitude` (decimal) - Position GPS actuelle du chauffeur
  - `current_longitude` (decimal) - Position GPS actuelle du chauffeur
  - `availability_status` (text) - Statut: 'available', 'busy', 'offline'
  - `preferred_zones` (text[]) - Zones géographiques préférées (codes postaux, villes)
  - `rating_average` (decimal) - Note moyenne (0-5)
  - `missions_completed` (integer) - Nombre de missions complétées
  
  ### 2. Table `driver_availability` (nouvelle)
  Gestion des disponibilités horaires des chauffeurs:
  - Plages horaires par jour de la semaine
  - Permet de savoir si un chauffeur est disponible à une date/heure donnée
  
  ### 3. Table `mission_assignments` (nouvelle)
  Gestion des assignations et recommandations:
  - Lien mission ↔ chauffeur avec score de recommandation
  - Historique des propositions (acceptées, refusées, expirées)
  - Calcul ETA et distance au moment de la recommandation
  
  ### 4. Table `driver_mission_history` (nouvelle)
  Historique des performances des chauffeurs:
  - Note par mission
  - Temps de trajet réel vs estimé
  - Commentaires client
  
  ## Sécurité
  - RLS activé sur toutes les tables
  - Politiques restrictives par utilisateur
  - Les chauffeurs peuvent voir leurs assignations
  - Les utilisateurs peuvent voir leurs chauffeurs et assignations

  ## Index
  - Index sur les coordonnées GPS pour recherche géographique rapide
  - Index sur availability_status pour filtrage rapide
  - Index composites pour optimisation des requêtes de recommandation
*/

-- ============================================================================
-- 1. MISE À JOUR TABLE CONTACTS - AJOUT CHAMPS CHAUFFEUR
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'is_driver'
  ) THEN
    ALTER TABLE contacts ADD COLUMN is_driver boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'driver_licenses'
  ) THEN
    ALTER TABLE contacts ADD COLUMN driver_licenses text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'current_latitude'
  ) THEN
    ALTER TABLE contacts ADD COLUMN current_latitude decimal(10, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'current_longitude'
  ) THEN
    ALTER TABLE contacts ADD COLUMN current_longitude decimal(11, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'availability_status'
  ) THEN
    ALTER TABLE contacts ADD COLUMN availability_status text DEFAULT 'offline';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'preferred_zones'
  ) THEN
    ALTER TABLE contacts ADD COLUMN preferred_zones text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'rating_average'
  ) THEN
    ALTER TABLE contacts ADD COLUMN rating_average decimal(3, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'missions_completed'
  ) THEN
    ALTER TABLE contacts ADD COLUMN missions_completed integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'last_location_update'
  ) THEN
    ALTER TABLE contacts ADD COLUMN last_location_update timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_driver_location 
  ON contacts(current_latitude, current_longitude) 
  WHERE is_driver = true;

CREATE INDEX IF NOT EXISTS idx_contacts_availability 
  ON contacts(availability_status) 
  WHERE is_driver = true;

CREATE INDEX IF NOT EXISTS idx_contacts_is_driver 
  ON contacts(is_driver) 
  WHERE is_driver = true;

-- ============================================================================
-- 2. TABLE DRIVER_AVAILABILITY - DISPONIBILITÉS HORAIRES
-- ============================================================================

CREATE TABLE IF NOT EXISTS driver_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_availability_contact_id ON driver_availability(contact_id);
CREATE INDEX IF NOT EXISTS idx_driver_availability_day ON driver_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_driver_availability_active ON driver_availability(is_active) WHERE is_active = true;

ALTER TABLE driver_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own driver availability"
  ON driver_availability FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can view their availability"
  ON driver_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = driver_availability.contact_id
      AND contacts.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- 3. TABLE MISSION_ASSIGNMENTS - ASSIGNATIONS ET RECOMMANDATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS mission_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'recommended',
  proximity_score decimal(5, 2) DEFAULT 0,
  availability_score decimal(5, 2) DEFAULT 0,
  license_score decimal(5, 2) DEFAULT 0,
  history_score decimal(5, 2) DEFAULT 0,
  distance_km decimal(10, 2),
  eta_minutes integer,
  recommendation_reason text,
  proposed_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mission_assignments' AND column_name = 'total_score'
  ) THEN
    ALTER TABLE mission_assignments ADD COLUMN total_score decimal(5, 2) DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mission_assignments_mission_id ON mission_assignments(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_assignments_contact_id ON mission_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_mission_assignments_status ON mission_assignments(status);
CREATE INDEX IF NOT EXISTS idx_mission_assignments_score ON mission_assignments(total_score DESC);

ALTER TABLE mission_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own mission assignments"
  ON mission_assignments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can view their assignments"
  ON mission_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Drivers can update their assignments"
  ON mission_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- 4. TABLE DRIVER_MISSION_HISTORY - HISTORIQUE PERFORMANCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS driver_mission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer,
  comment text,
  estimated_duration_minutes integer,
  actual_duration_minutes integer,
  was_on_time boolean,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_history_contact_id ON driver_mission_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_driver_history_mission_id ON driver_mission_history(mission_id);
CREATE INDEX IF NOT EXISTS idx_driver_history_rating ON driver_mission_history(rating);

ALTER TABLE driver_mission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own driver history"
  ON driver_mission_history FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can view their history"
  ON driver_mission_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = driver_mission_history.contact_id
      AND contacts.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

CREATE TRIGGER update_driver_availability_updated_at 
  BEFORE UPDATE ON driver_availability
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mission_assignments_updated_at 
  BEFORE UPDATE ON mission_assignments
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. FONCTIONS UTILITAIRES
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 decimal,
  lon1 decimal,
  lat2 decimal,
  lon2 decimal
)
RETURNS decimal AS $$
DECLARE
  earth_radius_km decimal := 6371.0;
  dlat decimal;
  dlon decimal;
  a decimal;
  c decimal;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius_km * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET 
    rating_average = (
      SELECT COALESCE(AVG(rating), 0)
      FROM driver_mission_history
      WHERE contact_id = NEW.contact_id
      AND rating IS NOT NULL
    ),
    missions_completed = (
      SELECT COUNT(*)
      FROM driver_mission_history
      WHERE contact_id = NEW.contact_id
    )
  WHERE id = NEW.contact_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_rating
  AFTER INSERT OR UPDATE ON driver_mission_history
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_rating();