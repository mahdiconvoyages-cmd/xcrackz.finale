-- ================================================
-- SIMPLIFICATION DES DESCRIPTIONS DE LA BOUTIQUE
-- Suppression du texte superflu pour le covoiturage
-- ================================================

-- Mettre à jour les descriptions des offres MENSUELLES
UPDATE credits_packages
SET description = '75 crédits par mois + Tracking GPS illimité gratuit'
WHERE name = 'Pro' AND billing_period = 'monthly';

UPDATE credits_packages
SET description = '250 crédits par mois + Tracking GPS illimité gratuit'
WHERE name = 'Business' AND billing_period = 'monthly';

UPDATE credits_packages
SET description = '1000 crédits par mois + Tracking GPS illimité gratuit + Support premium'
WHERE name = 'Enterprise' AND billing_period = 'monthly';

-- Mettre à jour les descriptions des offres ANNUELLES
UPDATE credits_packages
SET description = '75 crédits par mois + Tracking GPS illimité gratuit pendant 12 mois'
WHERE name = 'Pro' AND billing_period = 'annual';

UPDATE credits_packages
SET description = '250 crédits par mois + Tracking GPS illimité gratuit pendant 12 mois'
WHERE name = 'Business' AND billing_period = 'annual';

UPDATE credits_packages
SET description = '1000 crédits par mois + Tracking GPS illimité gratuit + Support premium pendant 12 mois'
WHERE name = 'Enterprise' AND billing_period = 'annual';
