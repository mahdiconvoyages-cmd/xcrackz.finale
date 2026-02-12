-- ============================================================
-- FIX: Align shop_items with actual plans (Shop.tsx source of truth)
-- Old DB had: starter(9.99€/10cr), basic(19.99€/25cr), pro(49.99€/100cr), 
--             business(79.99€/500cr), enterprise(119.99€/1500cr)
-- Real plans: essentiel(10€/10cr), pro(20€/20cr), business(50€/100cr), 
--             enterprise(sur devis/custom)
-- ============================================================

-- 1) Remove old/mismatched subscription plans
DELETE FROM shop_items WHERE item_type = 'subscription';

-- 2) Insert the correct plans matching Shop.tsx

INSERT INTO shop_items (name, description, item_type, credits_amount, price, currency, is_active, features, display_order)
VALUES
  (
    'essentiel',
    'Idéal pour démarrer — Accès complet à toute la plateforme',
    'subscription',
    10,
    10,
    'EUR',
    true,
    '{"features": ["10 crédits/mois", "Accès complet plateforme", "Missions, inspections, GPS, facturation", "Rapports PDF", "CRM & gestion clients", "Support par email"]}',
    1
  ),
  (
    'pro',
    'Le plus populaire — Assistant & fonctionnalités avancées',
    'subscription',
    20,
    20,
    'EUR',
    true,
    '{"features": ["20 crédits/mois", "Assistant & génération auto", "Scanner intelligent avancé", "Optimisation de trajets", "Rapports PDF enrichis", "Support prioritaire"], "popular": true}',
    2
  ),
  (
    'business',
    'Volume idéal flottes & équipes',
    'subscription',
    100,
    50,
    'EUR',
    true,
    '{"features": ["100 crédits/mois", "Frais de mise en place OFFERTS", "Toutes les fonctionnalités avancées", "Export comptable avancé", "Support dédié téléphone"]}',
    3
  ),
  (
    'enterprise',
    'Sur devis — Crédits et accompagnement personnalisés',
    'subscription',
    0,
    0,
    'EUR',
    true,
    '{"features": ["Crédits sur mesure", "Accompagnement personnalisé", "Support dédié", "Formation incluse"]}',
    4
  );

-- 3) Also migrate any existing subscriptions with old plan names
UPDATE public.subscriptions SET plan = 'essentiel' WHERE plan IN ('starter', 'basic');

-- 4) Verify
SELECT name, credits_amount, price, display_order, is_active
FROM shop_items 
WHERE item_type = 'subscription' 
ORDER BY display_order;
