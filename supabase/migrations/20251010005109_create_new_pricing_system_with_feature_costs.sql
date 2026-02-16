/*
  # Nouveau système de tarification avec coûts par fonctionnalité

  ## Description
  Création d'un nouveau système de boutique avec 5 plans tarifaires et gestion
  des coûts en crédits par fonctionnalité.

  ## Nouveaux plans
  1. Starter - 9.99€/mois - 10 crédits
  2. Basic - 19.99€/mois - 25 crédits
  3. Pro - 49.99€/mois - 100 crédits (tracking gratuit)
  4. Business - 79.99€/mois - 500 crédits (tracking gratuit)
  5. Enterprise - 119.99€/mois - 1500 crédits (tracking gratuit)

  ## Coûts des fonctionnalités
  - Création de mission: 1 crédit
  - Inspection véhicule: GRATUIT (si mission créée)
  - Tracking GPS par localisation: 1 crédit (GRATUIT pour Pro+)
  - Publier trajet covoiturage: 2 crédits
  - Réserver covoiturage: 2 crédits
  - Facturation/Devis: Inclus (accès illimité)
  - Scan documents: Inclus (accès illimité)

  ## Tables
  1. Mise à jour de credits_packages
  2. Création de feature_costs (coûts des fonctionnalités)
  3. Création de subscription_benefits (avantages par plan)
  4. Ajout abonnements annuels

  ## Sécurité
  - RLS activé sur toutes les tables
  - Accès contrôlé par authentification
*/

-- Supprimer les anciens packages
DELETE FROM credits_packages;

-- Insérer les nouveaux plans mensuels
INSERT INTO credits_packages (name, description, credits, price, is_popular, is_active) VALUES
  (
    'Starter',
    'Parfait pour débuter dans le convoyage',
    10,
    9.99,
    false,
    true
  ),
  (
    'Basic',
    'Pour les convoyeurs réguliers',
    25,
    19.99,
    false,
    true
  ),
  (
    'Pro',
    'Le plus populaire - Tracking GPS gratuit',
    100,
    49.99,
    true,
    true
  ),
  (
    'Business',
    'Pour les professionnels - Tracking GPS gratuit',
    500,
    79.99,
    false,
    true
  ),
  (
    'Enterprise',
    'Solution complète pour grandes structures',
    1500,
    119.99,
    false,
    true
  );

-- Créer la table des coûts par fonctionnalité
CREATE TABLE IF NOT EXISTS feature_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text UNIQUE NOT NULL,
  feature_key text UNIQUE NOT NULL,
  description text,
  credit_cost integer NOT NULL DEFAULT 0,
  free_from_plan text, -- 'pro', 'business', 'enterprise'
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insérer les coûts des fonctionnalités
INSERT INTO feature_costs (feature_name, feature_key, description, credit_cost, free_from_plan, is_active) VALUES
  ('Création de mission', 'mission_create', 'Créer une nouvelle mission de convoyage', 1, NULL, true),
  ('Inspection véhicule', 'inspection', 'Effectuer une inspection de véhicule (gratuit si mission créée)', 0, NULL, true),
  ('Tracking GPS', 'tracking_location', 'Enregistrer une position GPS pour le suivi', 1, 'pro', true),
  ('Publier trajet covoiturage', 'covoiturage_publish', 'Publier une offre de covoiturage', 2, NULL, true),
  ('Réserver covoiturage', 'covoiturage_book', 'Réserver un trajet de covoiturage', 2, NULL, true),
  ('Facturation', 'billing', 'Accès illimité à la facturation et devis', 0, NULL, true),
  ('Scan documents', 'document_scan', 'Scanner des documents en illimité', 0, NULL, true);

-- Créer la table des avantages par plan
CREATE TABLE IF NOT EXISTS subscription_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  benefit_key text NOT NULL,
  benefit_description text NOT NULL,
  is_included boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insérer les avantages par plan
INSERT INTO subscription_benefits (plan_name, benefit_key, benefit_description, is_included) VALUES
  -- Starter
  ('starter', 'missions', '10 missions par mois', true),
  ('starter', 'users', '1 utilisateur', true),
  ('starter', 'billing', 'Facturation & Devis illimités', true),
  ('starter', 'scan', 'Scan de documents', true),
  ('starter', 'support', 'Support par email', true),
  
  -- Basic
  ('basic', 'missions', '25 missions par mois', true),
  ('basic', 'users', '2 utilisateurs', true),
  ('basic', 'billing', 'Facturation & Devis illimités', true),
  ('basic', 'scan', 'Scan de documents', true),
  ('basic', 'support', 'Support prioritaire', true),
  ('basic', 'covoiturage', 'Covoiturage inclus', true),
  
  -- Pro
  ('pro', 'missions', '100 missions par mois', true),
  ('pro', 'users', '5 utilisateurs', true),
  ('pro', 'billing', 'Facturation & Devis illimités', true),
  ('pro', 'scan', 'Scan de documents', true),
  ('pro', 'tracking_free', 'Tracking GPS GRATUIT', true),
  ('pro', 'support', 'Support prioritaire 24/7', true),
  ('pro', 'covoiturage', 'Covoiturage inclus', true),
  
  -- Business
  ('business', 'missions', '500 missions par mois', true),
  ('business', 'users', '10 utilisateurs', true),
  ('business', 'billing', 'Facturation & Devis illimités', true),
  ('business', 'scan', 'Scan de documents', true),
  ('business', 'tracking_free', 'Tracking GPS GRATUIT', true),
  ('business', 'api', 'Accès API', true),
  ('business', 'support', 'Support dédié 24/7', true),
  ('business', 'covoiturage', 'Covoiturage illimité', true),
  
  -- Enterprise
  ('enterprise', 'missions', '1500 missions par mois', true),
  ('enterprise', 'users', 'Utilisateurs illimités', true),
  ('enterprise', 'billing', 'Facturation & Devis illimités', true),
  ('enterprise', 'scan', 'Scan de documents', true),
  ('enterprise', 'tracking_free', 'Tracking GPS GRATUIT', true),
  ('enterprise', 'api', 'API personnalisée', true),
  ('enterprise', 'support', 'Account manager dédié', true),
  ('enterprise', 'covoiturage', 'Covoiturage illimité', true),
  ('enterprise', 'training', 'Formation équipe', true),
  ('enterprise', 'custom', 'Fonctionnalités sur mesure', true);

-- Ajouter colonne pour le type d'abonnement (mensuel/annuel)
ALTER TABLE credits_packages ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual'));
ALTER TABLE credits_packages ADD COLUMN IF NOT EXISTS discount_percent integer DEFAULT 0;

-- Créer les plans annuels (20% de réduction)
INSERT INTO credits_packages (name, description, credits, price, is_popular, is_active, billing_period, discount_percent)
SELECT 
  name,
  description,
  credits * 12,
  ROUND((price * 12 * 0.80)::numeric, 2), -- 20% de réduction
  is_popular,
  is_active,
  'annual',
  20
FROM credits_packages
WHERE billing_period = 'monthly';

-- Ajouter colonne pour indiquer si le tracking est gratuit
ALTER TABLE credits_packages ADD COLUMN IF NOT EXISTS free_tracking boolean DEFAULT false;

-- Mettre à jour les plans avec tracking gratuit
UPDATE credits_packages 
SET free_tracking = true 
WHERE name IN ('Pro', 'Business', 'Enterprise');

-- Table pour logger l'utilisation des crédits par fonctionnalité
CREATE TABLE IF NOT EXISTS credit_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  credits_used integer NOT NULL,
  was_free boolean DEFAULT false,
  reason text,
  reference_id uuid, -- ID de la mission, covoiturage, etc.
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_usage_user ON credit_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_feature ON credit_usage_log(feature_key);
CREATE INDEX IF NOT EXISTS idx_credit_usage_date ON credit_usage_log(created_at DESC);

-- Fonction pour déduire des crédits avec vérification du plan
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_feature_key text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_cost integer;
  v_current_balance integer;
  v_free_from_plan text;
  v_user_plan text;
  v_is_free boolean := false;
  v_has_free_tracking boolean := false;
BEGIN
  -- Récupérer le coût de la fonctionnalité
  SELECT credit_cost, free_from_plan
  INTO v_cost, v_free_from_plan
  FROM feature_costs
  WHERE feature_key = p_feature_key AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feature not found');
  END IF;

  -- Récupérer le solde actuel
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User credits not found');
  END IF;

  -- Vérifier si l'utilisateur a un plan avec cette fonctionnalité gratuite
  SELECT cp.name, cp.free_tracking
  INTO v_user_plan, v_has_free_tracking
  FROM subscriptions s
  JOIN credits_packages cp ON cp.id = s.package_id
  WHERE s.user_id = p_user_id
  AND s.status = 'active'
  AND s.current_period_end > now()
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Vérifier si la fonctionnalité est gratuite pour ce plan
  IF v_free_from_plan IS NOT NULL THEN
    IF (v_free_from_plan = 'pro' AND v_user_plan IN ('Pro', 'Business', 'Enterprise')) OR
       (v_free_from_plan = 'business' AND v_user_plan IN ('Business', 'Enterprise')) OR
       (v_free_from_plan = 'enterprise' AND v_user_plan = 'Enterprise') THEN
      v_is_free := true;
    END IF;
  END IF;

  -- Cas spécial tracking GPS
  IF p_feature_key = 'tracking_location' AND v_has_free_tracking = true THEN
    v_is_free := true;
  END IF;

  -- Déduire les crédits si pas gratuit
  IF NOT v_is_free THEN
    IF v_current_balance < v_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
    END IF;

    UPDATE user_credits
    SET balance = balance - v_cost
    WHERE user_id = p_user_id;
  END IF;

  -- Logger l'utilisation
  INSERT INTO credit_usage_log (user_id, feature_key, credits_used, was_free, reference_id)
  VALUES (p_user_id, p_feature_key, CASE WHEN v_is_free THEN 0 ELSE v_cost END, v_is_free, p_reference_id);

  RETURN jsonb_build_object(
    'success', true,
    'credits_used', CASE WHEN v_is_free THEN 0 ELSE v_cost END,
    'was_free', v_is_free,
    'new_balance', v_current_balance - CASE WHEN v_is_free THEN 0 ELSE v_cost END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS sur les nouvelles tables
ALTER TABLE feature_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage_log ENABLE ROW LEVEL SECURITY;

-- Policies pour feature_costs (lecture publique)
CREATE POLICY "Anyone can view feature costs"
  ON feature_costs FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policies pour subscription_benefits (lecture publique)
CREATE POLICY "Anyone can view subscription benefits"
  ON subscription_benefits FOR SELECT
  TO authenticated
  USING (true);

-- Policies pour credit_usage_log (utilisateur voit son propre historique)
CREATE POLICY "Users can view own usage log"
  ON credit_usage_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins peuvent tout voir
CREATE POLICY "Admins can view all usage logs"
  ON credit_usage_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_feature_costs_updated_at ON feature_costs;
CREATE TRIGGER update_feature_costs_updated_at
  BEFORE UPDATE ON feature_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
