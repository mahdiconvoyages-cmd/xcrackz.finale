/*
  # Replace Shop with Correct Plans - Fixed

  1. Delete all existing shop items
  2. Insert correct subscription plans:
    - Starter: 10 crédits - 9.99€
    - Basic: 25 crédits - 19.99€
    - Pro: 100 crédits - 49.99€
    - Business: 500 crédits - 79.99€
    - Enterprise: 1500 crédits - 119.99€

  3. Insert feature costs (using 'feature' type)
*/

-- Delete all existing shop items
DELETE FROM shop_items;

-- Insert subscription plans
INSERT INTO shop_items (name, description, item_type, credits_amount, price, currency, is_active, features, display_order)
VALUES
  (
    'starter',
    'Parfait pour débuter - Accès complet à toutes les fonctionnalités',
    'subscription',
    10,
    9.99,
    'EUR',
    true,
    '{"features": ["10 crédits/mois", "10 missions max/mois", "Facturation & Devis illimités", "Scan de documents illimité"]}',
    1
  ),
  (
    'basic',
    'Pour les convoyeurs réguliers - Covoiturage inclus',
    'subscription',
    25,
    19.99,
    'EUR',
    true,
    '{"features": ["25 crédits/mois", "25 missions max/mois", "Facturation & Devis illimités", "Scan de documents illimité", "Covoiturage inclus"]}',
    2
  ),
  (
    'pro',
    'Le plus populaire - Tracking GPS illimité gratuit',
    'subscription',
    100,
    49.99,
    'EUR',
    true,
    '{"features": ["100 crédits/mois", "100 missions max/mois", "Facturation & Devis illimités", "Scan de documents illimité", "Covoiturage inclus", "Tracking GPS illimité GRATUIT"], "popular": true}',
    3
  ),
  (
    'business',
    'Pour les gros volumes - Tracking GPS + API gratuits',
    'subscription',
    500,
    79.99,
    'EUR',
    true,
    '{"features": ["500 crédits/mois", "500 missions max/mois", "Facturation & Devis illimités", "Scan de documents illimité", "Covoiturage inclus", "Tracking GPS illimité GRATUIT"]}',
    4
  ),
  (
    'enterprise',
    'Solution maximale - Tracking GPS + API + Support dédié',
    'subscription',
    1500,
    119.99,
    'EUR',
    true,
    '{"features": ["1500 crédits/mois", "1500 missions max/mois", "Facturation & Devis illimités", "Scan de documents illimité", "Covoiturage inclus", "Tracking GPS illimité GRATUIT", "Support dédié prioritaire"]}',
    5
  );

-- Insert feature costs
INSERT INTO shop_items (name, description, item_type, credits_amount, price, currency, is_active, features, display_order)
VALUES
  (
    'create_mission',
    'Créer une nouvelle mission de convoyage',
    'feature',
    1,
    0,
    'EUR',
    true,
    '{"credit_cost": 1, "free_for_plans": []}',
    10
  ),
  (
    'vehicle_inspection',
    'Effectuer une inspection de véhicule (gratuit si mission créée)',
    'feature',
    0,
    0,
    'EUR',
    true,
    '{"credit_cost": 0, "free_for_plans": ["all"]}',
    11
  ),
  (
    'gps_tracking',
    'Enregistrer une position GPS pour le suivi - Gratuit à partir du plan Pro',
    'feature',
    1,
    0,
    'EUR',
    true,
    '{"credit_cost": 1, "free_for_plans": ["pro", "business", "enterprise"]}',
    12
  ),
  (
    'publish_carpooling',
    'Publier une offre de covoiturage',
    'feature',
    2,
    0,
    'EUR',
    true,
    '{"credit_cost": 2, "free_for_plans": []}',
    13
  ),
  (
    'book_carpooling',
    'Réserver un trajet de covoiturage',
    'feature',
    2,
    0,
    'EUR',
    true,
    '{"credit_cost": 2, "free_for_plans": []}',
    14
  ),
  (
    'billing',
    'Accès illimité à la facturation et devis',
    'feature',
    0,
    0,
    'EUR',
    true,
    '{"credit_cost": 0, "free_for_plans": ["all"]}',
    15
  ),
  (
    'document_scan',
    'Scanner des documents en illimité',
    'feature',
    0,
    0,
    'EUR',
    true,
    '{"credit_cost": 0, "free_for_plans": ["all"]}',
    16
  );

-- Refresh all existing users with correct credits
UPDATE user_credits uc
SET balance = si.credits_amount
FROM subscriptions s
JOIN shop_items si ON si.name = s.plan AND si.item_type = 'subscription' AND si.is_active = true
WHERE uc.user_id = s.user_id
AND s.status = 'active';
