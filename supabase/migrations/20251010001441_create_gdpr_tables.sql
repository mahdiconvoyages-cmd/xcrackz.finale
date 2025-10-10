/*
  # Tables de gestion RGPD

  ## Description
  Ce fichier crée les tables nécessaires pour la conformité RGPD :
  - Table des consentements utilisateur
  - Table des demandes de suppression de compte
  - Table des logs d'accès aux données
  
  ## Nouvelles Tables
  
  1. `user_consents`
    - `id` (uuid, clé primaire)
    - `user_id` (uuid, référence profiles)
    - `analytics` (boolean) - Consentement cookies analytics
    - `marketing` (boolean) - Consentement marketing
    - `functional` (boolean) - Consentement fonctionnel
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  2. `deletion_requests`
    - `id` (uuid, clé primaire)
    - `user_id` (uuid, référence profiles)
    - `reason` (text) - Raison de la suppression
    - `requested_at` (timestamptz)
    - `processed_at` (timestamptz, nullable)
    - `status` (text) - pending, approved, rejected, completed
  
  3. `data_access_logs`
    - `id` (uuid, clé primaire)
    - `user_id` (uuid, référence profiles)
    - `action` (text) - export, view, update, delete
    - `ip_address` (text)
    - `user_agent` (text)
    - `created_at` (timestamptz)
  
  ## Sécurité
  - RLS activé sur toutes les tables
  - Policies restrictives : utilisateurs peuvent uniquement accéder à leurs propres données
*/

-- Table des consentements utilisateur
CREATE TABLE IF NOT EXISTS user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  analytics boolean DEFAULT false,
  marketing boolean DEFAULT false,
  functional boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
  ON user_consents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON user_consents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents"
  ON user_consents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table des demandes de suppression
CREATE TABLE IF NOT EXISTS deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
  ON deletion_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deletion requests"
  ON deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Table des logs d'accès aux données
CREATE TABLE IF NOT EXISTS data_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN ('export', 'view', 'update', 'delete')),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access logs"
  ON data_access_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs(created_at DESC);
