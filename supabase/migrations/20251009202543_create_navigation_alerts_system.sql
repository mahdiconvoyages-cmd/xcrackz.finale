/*
  # Système d'alertes de navigation type Waze

  ## Description
  Ce système permet aux conducteurs de signaler et de voir des alertes en temps réel
  pendant leur navigation (police, accidents, dangers, trafic, radars).

  ## Fonctionnalités
  - Signalement d'incidents par les conducteurs
  - Visualisation des alertes à proximité
  - Système de votes pour valider les alertes
  - Expiration automatique des alertes anciennes

  ## Tables créées
  - navigation_alerts: Alertes signalées par les conducteurs

  ## Sécurité
  - RLS activé pour toutes les tables
  - Les conducteurs authentifiés peuvent:
    - Voir toutes les alertes récentes
    - Créer des alertes
    - Voter sur les alertes existantes
*/

-- ============================================================================
-- TABLE: NAVIGATION_ALERTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS navigation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('police', 'accident', 'hazard', 'traffic', 'speed_camera')),
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  description text,
  reported_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '1 hour',
  updated_at timestamptz DEFAULT now()
);

-- Index pour les requêtes géographiques
CREATE INDEX idx_alerts_location ON navigation_alerts(latitude, longitude);
CREATE INDEX idx_alerts_created ON navigation_alerts(created_at);
CREATE INDEX idx_alerts_expires ON navigation_alerts(expires_at);
CREATE INDEX idx_alerts_type ON navigation_alerts(type);
CREATE INDEX idx_alerts_active ON navigation_alerts(is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE: ALERT_VOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES navigation_alerts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(alert_id, user_id)
);

CREATE INDEX idx_votes_alert ON alert_votes(alert_id);
CREATE INDEX idx_votes_user ON alert_votes(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE navigation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_votes ENABLE ROW LEVEL SECURITY;

-- Tous les utilisateurs authentifiés peuvent voir les alertes actives récentes
CREATE POLICY "Anyone can view active alerts"
  ON navigation_alerts
  FOR SELECT
  TO authenticated
  USING (is_active = true AND expires_at > now());

-- Les utilisateurs authentifiés peuvent créer des alertes
CREATE POLICY "Authenticated users can create alerts"
  ON navigation_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- Seul le créateur peut mettre à jour son alerte
CREATE POLICY "Users can update own alerts"
  ON navigation_alerts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = reported_by)
  WITH CHECK (auth.uid() = reported_by);

-- Les utilisateurs peuvent voter
CREATE POLICY "Users can vote on alerts"
  ON alert_votes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FONCTIONS
-- ============================================================================

-- Fonction pour mettre à jour les votes d'une alerte
CREATE OR REPLACE FUNCTION update_alert_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE navigation_alerts
      SET upvotes = upvotes + 1
      WHERE id = NEW.alert_id;
    ELSE
      UPDATE navigation_alerts
      SET downvotes = downvotes + 1
      WHERE id = NEW.alert_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'up' AND NEW.vote_type = 'down' THEN
      UPDATE navigation_alerts
      SET upvotes = upvotes - 1, downvotes = downvotes + 1
      WHERE id = NEW.alert_id;
    ELSIF OLD.vote_type = 'down' AND NEW.vote_type = 'up' THEN
      UPDATE navigation_alerts
      SET downvotes = downvotes - 1, upvotes = upvotes + 1
      WHERE id = NEW.alert_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE navigation_alerts
      SET upvotes = upvotes - 1
      WHERE id = OLD.alert_id;
    ELSE
      UPDATE navigation_alerts
      SET downvotes = downvotes - 1
      WHERE id = OLD.alert_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour les votes
DROP TRIGGER IF EXISTS trg_update_alert_votes ON alert_votes;
CREATE TRIGGER trg_update_alert_votes
  AFTER INSERT OR UPDATE OR DELETE ON alert_votes
  FOR EACH ROW EXECUTE FUNCTION update_alert_votes();

-- Fonction pour désactiver les alertes avec trop de downvotes
CREATE OR REPLACE FUNCTION deactivate_unpopular_alerts()
RETURNS void AS $$
BEGIN
  UPDATE navigation_alerts
  SET is_active = false
  WHERE downvotes > upvotes * 2
  AND downvotes >= 5
  AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les alertes expirées
CREATE OR REPLACE FUNCTION cleanup_expired_alerts()
RETURNS void AS $$
BEGIN
  UPDATE navigation_alerts
  SET is_active = false
  WHERE expires_at < now()
  AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_alerts_updated
  BEFORE UPDATE ON navigation_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
