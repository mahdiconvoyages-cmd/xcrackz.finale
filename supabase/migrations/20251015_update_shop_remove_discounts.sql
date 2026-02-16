-- Migration: Mise à jour descriptions et clarification abonnements
-- Date: 2025-10-15
-- Description: 
--   1. Pas de réduction sur les plans annuels (prix = mensuel × 12)
--   2. Désactive le pack Starter (attribution admin uniquement)
--   3. Clarifie que les crédits sont MENSUELS dans les 2 cas (mensuel ET annuel)
--   4. Annuel = Paiement 1 fois/an, mais crédits distribués mensuellement (expirables 30j)

-- ============================================
-- 1. CLARIFICATION SYSTÈME D'ABONNEMENT
-- ============================================

-- IMPORTANT: 
-- - Mensuel: Paiement chaque mois → 25 crédits/mois (expirables 30j)
-- - Annuel: Paiement 1 fois/an → 25 crédits/mois (expirables 30j) pendant 12 mois
-- 
-- Les crédits ne s'accumulent PAS, ils expirent après 30 jours.
-- La seule différence est la modalité de paiement (mensuel vs annuel).

-- Pas de modification des prix annuels nécessaire
-- Les prix annuels = prix mensuel × 12 (déjà corrects en base)
-- Exemple: Essentiel Mensuel 19.99€ → Essentiel Annuel 239.88€ (19.99 × 12)

-- S'assurer que discount_percent = 0 (pas de réduction, juste paiement annuel)
UPDATE credits_packages
SET discount_percent = 0
WHERE billing_period = 'annual';

-- ============================================
-- 2. DÉSACTIVER LE PACK STARTER (ADMIN UNIQUEMENT)
-- ============================================

-- Le pack Starter reste en base mais invisible dans la boutique
-- Il pourra être attribué manuellement par un admin
UPDATE credits_packages
SET is_active = false
WHERE name = 'Starter';

-- ============================================
-- 3. METTRE À JOUR LES DESCRIPTIONS
-- ============================================

-- Pack Essentiel (Mensuel)
UPDATE credits_packages
SET description = 'Paiement mensuel. 25 crédits/mois renouvelés automatiquement chaque mois. Crédits valables 30 jours. Parfait pour démarrer avec suivi GPS, facturation et CRM.'
WHERE billing_period = 'monthly' AND name = 'Essentiel';

-- Pack Pro (Mensuel)
UPDATE credits_packages
SET description = 'Paiement mensuel. 75 crédits/mois + GPS illimité GRATUIT. Renouvellement automatique. Gestion multi-clients, devis automatiques et support prioritaire.'
WHERE billing_period = 'monthly' AND name = 'Pro';

-- Pack Business (Mensuel)
UPDATE credits_packages
SET description = 'Paiement mensuel. 250 crédits/mois + GPS gratuit. Renouvellement automatique. Gestion d''équipe, planning avancé, analytics et support 24/7.'
WHERE billing_period = 'monthly' AND name = 'Business';

-- Pack Enterprise (Mensuel)
UPDATE credits_packages
SET description = 'Paiement mensuel. 1000 crédits/mois + GPS gratuit. Volume pro, API personnalisée, multi-sites et account manager dédié. Support premium.'
WHERE billing_period = 'monthly' AND name = 'Enterprise';

-- Pack Essentiel (Annuel)
UPDATE credits_packages
SET description = 'Paiement annuel (1 fois/an). 25 crédits/mois distribués automatiquement pendant 12 mois. Crédits valables 30j. Même quantité que mensuel, paiement annualisé.'
WHERE billing_period = 'annual' AND name = 'Essentiel';

-- Pack Pro (Annuel)
UPDATE credits_packages
SET description = 'Paiement annuel (1 fois/an). 75 crédits/mois + GPS GRATUIT pendant 12 mois. Crédits renouvelés automatiquement chaque mois. Paiement unique annuel.'
WHERE billing_period = 'annual' AND name = 'Pro';

-- Pack Business (Annuel)
UPDATE credits_packages
SET description = 'Paiement annuel (1 fois/an). 250 crédits/mois + GPS gratuit pendant 12 mois. Distribution mensuelle automatique. Engagement annuel, facturation unique.'
WHERE billing_period = 'annual' AND name = 'Business';

-- Pack Enterprise (Annuel)
UPDATE credits_packages
SET description = 'Paiement annuel (1 fois/an). 1000 crédits/mois + GPS gratuit pendant 12 mois. Renouvellement mensuel automatique. Account manager dédié toute l''année.'
WHERE billing_period = 'annual' AND name = 'Enterprise';

-- ============================================
-- 4. VÉRIFICATION DES CHANGEMENTS
-- ============================================

-- Afficher tous les packs avec leurs nouvelles infos
SELECT 
  name,
  billing_period,
  credits,
  price,
  discount_percent,
  description,
  is_active
FROM credits_packages
ORDER BY billing_period, price;

-- Vérifier que le Starter est désactivé (is_active = false)
SELECT COUNT(*) as starter_desactive_count
FROM credits_packages
WHERE name = 'Starter' AND is_active = false;
-- Doit retourner 2 (mensuel + annuel désactivés)

-- Vérifier qu'il n'y a plus de réduction
SELECT COUNT(*) as plans_avec_reduction
FROM credits_packages
WHERE discount_percent > 0;
-- Doit retourner 0

COMMIT;
