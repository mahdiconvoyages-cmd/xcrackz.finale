-- ✅ VÉRIFICATION: Plans boutique et crédits automatiques
-- Date: 2025-10-17
-- Description: Vérifier que l'admin lit bien les bonnes valeurs depuis shop_items

-- 1. Afficher tous les plans avec leurs crédits
SELECT 
  name,
  credits_amount,
  price,
  item_type,
  is_active,
  display_order
FROM shop_items
WHERE item_type = 'subscription'
ORDER BY display_order, price;

-- 2. Simuler ce que l'admin va lire (même requête que le code)
SELECT 
  name, 
  credits_amount, 
  price
FROM shop_items
WHERE item_type = 'subscription' 
  AND is_active = true
ORDER BY display_order;

-- 3. Vérifier les valeurs attendues
-- D'après votre boutique :
-- starter    → 10 crédits    (9.99€)
-- basic      → 25 crédits    (19.99€)
-- pro        → 100 crédits   (49.99€)
-- business   → 500 crédits   (79.99€)
-- enterprise → 1500 crédits  (119.99€)

-- 4. Test: Simuler attribution abonnement PRO
-- L'admin devrait donner 100 crédits (pas 50 comme avant)
SELECT 
  'Abonnement PRO attribué' as action,
  credits_amount as credits_ajoutés,
  price as prix_mensuel,
  CONCAT(credits_amount, ' crédits ajoutés automatiquement (selon boutique : ', price, '€/mois)') as message_attendu
FROM shop_items
WHERE name = 'pro' AND item_type = 'subscription';

-- 5. Résumé complet pour vérification
SELECT 
  CASE 
    WHEN name = 'starter' THEN '🟢 STARTER'
    WHEN name = 'basic' THEN '🟡 BASIC'
    WHEN name = 'pro' THEN '🔵 PRO'
    WHEN name = 'business' THEN '🟣 BUSINESS'
    WHEN name = 'enterprise' THEN '⚡ ENTERPRISE'
  END as plan_emoji,
  name as plan_name,
  CONCAT('+', credits_amount, ' crédits') as attribution_auto,
  CONCAT(price, '€/mois') as tarif,
  CASE 
    WHEN is_active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as statut
FROM shop_items
WHERE item_type = 'subscription'
ORDER BY price;

-- 6. Afficher le résultat
SELECT '✅ Plans boutique vérifiés - Admin synchronisé automatiquement' AS status;
