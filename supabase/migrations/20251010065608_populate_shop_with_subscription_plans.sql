/*
  # Populate Shop with Subscription Plans

  1. Insert subscription plans with credits
    - Free: 10 credits
    - Basic: 50 credits
    - Pro: 100 credits
    - Premium: 250 credits
    - Enterprise: 500 credits
    - Business: 1000 credits

  2. Each plan includes:
    - Name, description
    - Credits amount
    - Price
    - Features (JSON)
*/

-- Insert subscription plans
INSERT INTO shop_items (name, description, item_type, credits_amount, price, currency, is_active, features, display_order)
VALUES
  (
    'free',
    'Plan gratuit pour découvrir FleetCheck',
    'subscription',
    10,
    0.00,
    'EUR',
    true,
    '{"features": ["10 crédits mensuels", "Accès de base", "Support email"]}',
    1
  ),
  (
    'basic',
    'Plan basique pour petites équipes',
    'subscription',
    50,
    9.99,
    'EUR',
    true,
    '{"features": ["50 crédits mensuels", "Accès complet", "Support prioritaire", "Export PDF"]}',
    2
  ),
  (
    'pro',
    'Plan professionnel pour équipes moyennes',
    'subscription',
    100,
    19.99,
    'EUR',
    true,
    '{"features": ["100 crédits mensuels", "Accès illimité", "Support 24/7", "API Access", "Export avancé"]}',
    3
  ),
  (
    'premium',
    'Plan premium pour grandes équipes',
    'subscription',
    250,
    49.99,
    'EUR',
    true,
    '{"features": ["250 crédits mensuels", "Tous les avantages Pro", "Manager dédié", "Formation personnalisée"]}',
    4
  ),
  (
    'enterprise',
    'Plan entreprise pour organisations',
    'subscription',
    500,
    99.99,
    'EUR',
    true,
    '{"features": ["500 crédits mensuels", "Tous les avantages Premium", "SLA garanti", "Infrastructure dédiée"]}',
    5
  ),
  (
    'business',
    'Plan business pour grands comptes',
    'subscription',
    1000,
    199.99,
    'EUR',
    true,
    '{"features": ["1000 crédits mensuels", "Solution sur mesure", "Support VIP", "Intégration personnalisée"]}',
    6
  )
ON CONFLICT DO NOTHING;
