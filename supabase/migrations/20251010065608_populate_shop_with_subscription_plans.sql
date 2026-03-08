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
    'pro',
    'Plan Pro — 20 crédits/mois, accès complet',
    'subscription',
    20,
    20.00,
    'EUR',
    true,
    '{"features": ["20 crédits/mois", "Accès complet plateforme", "Missions, inspections, GPS", "Support prioritaire", "Facturation annuelle 240€/an"]}',
    1
  ),
  (
    'business',
    'Plan Business — 60 crédits/mois, idéal flottes',
    'subscription',
    60,
    50.00,
    'EUR',
    true,
    '{"features": ["60 crédits/mois", "Accès complet plateforme", "Volume idéal flottes & équipes", "Support dédié téléphone", "Facturation annuelle 600€/an"]}',
    2
  ),
  (
    'premium',
    'Plan Premium — 150 crédits/mois, volume important',
    'subscription',
    150,
    79.99,
    'EUR',
    true,
    '{"features": ["150 crédits/mois", "Accès complet plateforme", "Volume important de missions", "Support dédié prioritaire", "Facturation annuelle 959.88€/an"]}',
    3
  ),
  (
    'enterprise',
    'Plan sur-mesure pour entreprises',
    'subscription',
    500,
    0.00,
    'EUR',
    true,
    '{"features": ["Crédits sur mesure", "Tarification personnalisée", "Accompagnement dédié", "Formation équipes", "Sur devis"]}',
    4
  )
ON CONFLICT DO NOTHING;
