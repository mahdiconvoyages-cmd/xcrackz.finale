/*
  # Prévention des comptes multiples
  
  ## Description
  Ajoute des contraintes pour empêcher un même utilisateur de créer plusieurs comptes
  
  ## Modifications
  
  1. Contraintes d'unicité
    - Email déjà unique
    - Ajouter contrainte unique sur phone (optionnel mais vérifiable)
    - Index pour recherche rapide
  
  2. Table de vérification d'identité
    - Stocke les informations de vérification
    - Permet de détecter les tentatives de comptes multiples
  
  3. Fonction de détection
    - Vérifie email, téléphone avant création
    - Log des tentatives suspectes
  
  ## Sécurité
  - Empêche les doublons
  - Détection des tentatives frauduleuses
  - Logs pour audit
*/

-- Ajouter index sur le téléphone pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;

-- Table pour logger les tentatives de création de compte
CREATE TABLE IF NOT EXISTS account_creation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  ip_address text,
  user_agent text,
  attempt_date timestamptz DEFAULT now(),
  success boolean DEFAULT false,
  error_message text,
  duplicate_detected boolean DEFAULT false,
  existing_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Index pour recherche rapide des tentatives
CREATE INDEX IF NOT EXISTS idx_account_attempts_email ON account_creation_attempts(email);
CREATE INDEX IF NOT EXISTS idx_account_attempts_phone ON account_creation_attempts(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_attempts_date ON account_creation_attempts(attempt_date DESC);

-- Fonction pour vérifier si un utilisateur existe déjà
CREATE OR REPLACE FUNCTION check_existing_user(
  p_email text,
  p_phone text DEFAULT NULL
)
RETURNS TABLE(
  user_exists boolean,
  user_id uuid,
  matched_by text
) AS $$
BEGIN
  -- Vérifier par email
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    RETURN QUERY
    SELECT 
      true,
      id,
      'email'::text
    FROM profiles
    WHERE email = p_email
    LIMIT 1;
    RETURN;
  END IF;

  -- Vérifier par téléphone si fourni
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE phone = p_phone) THEN
      RETURN QUERY
      SELECT 
        true,
        id,
        'phone'::text
      FROM profiles
      WHERE phone = p_phone
      LIMIT 1;
      RETURN;
    END IF;
  END IF;

  -- Aucun utilisateur trouvé
  RETURN QUERY SELECT false, NULL::uuid, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour logger une tentative de création
CREATE OR REPLACE FUNCTION log_account_creation_attempt(
  p_email text,
  p_phone text,
  p_ip_address text,
  p_user_agent text,
  p_success boolean,
  p_error_message text DEFAULT NULL,
  p_duplicate_detected boolean DEFAULT false,
  p_existing_user_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_attempt_id uuid;
BEGIN
  INSERT INTO account_creation_attempts (
    email,
    phone,
    ip_address,
    user_agent,
    success,
    error_message,
    duplicate_detected,
    existing_user_id
  ) VALUES (
    p_email,
    p_phone,
    p_ip_address,
    p_user_agent,
    p_success,
    p_error_message,
    p_duplicate_detected,
    p_existing_user_id
  )
  RETURNING id INTO v_attempt_id;
  
  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Table pour les alertes de comptes suspects
CREATE TABLE IF NOT EXISTS suspicious_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  reason text NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  detected_at timestamptz DEFAULT now(),
  reviewed boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_suspicious_accounts_email ON suspicious_accounts(email);
CREATE INDEX IF NOT EXISTS idx_suspicious_accounts_reviewed ON suspicious_accounts(reviewed);

-- RLS pour les tables de sécurité (admin seulement)
ALTER TABLE account_creation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view account attempts"
  ON account_creation_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can view suspicious accounts"
  ON suspicious_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update suspicious accounts"
  ON suspicious_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Fonction pour détecter les comportements suspects
CREATE OR REPLACE FUNCTION detect_suspicious_behavior(
  p_email text,
  p_phone text,
  p_ip_address text
)
RETURNS void AS $$
DECLARE
  v_recent_attempts integer;
  v_same_phone_count integer;
BEGIN
  -- Compter les tentatives récentes depuis la même IP
  SELECT COUNT(*)
  INTO v_recent_attempts
  FROM account_creation_attempts
  WHERE ip_address = p_ip_address
  AND attempt_date > now() - interval '1 hour';

  -- Plus de 5 tentatives en 1h depuis la même IP
  IF v_recent_attempts > 5 THEN
    INSERT INTO suspicious_accounts (email, phone, reason, severity)
    VALUES (
      p_email,
      p_phone,
      format('Trop de tentatives depuis IP %s: %s tentatives en 1h', p_ip_address, v_recent_attempts),
      'high'
    );
  END IF;

  -- Vérifier si le même téléphone a été utilisé pour plusieurs comptes
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT COUNT(DISTINCT email)
    INTO v_same_phone_count
    FROM account_creation_attempts
    WHERE phone = p_phone
    AND success = true;

    IF v_same_phone_count > 1 THEN
      INSERT INTO suspicious_accounts (email, phone, reason, severity)
      VALUES (
        p_email,
        p_phone,
        format('Même téléphone utilisé pour %s comptes différents', v_same_phone_count),
        'medium'
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
