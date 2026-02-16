-- 🧪 TEST MOLLIE - VÉRIFICATION ACHATS ABONNEMENTS
-- Date: 2025-10-17
-- Objectif: Vérifier que les achats Mollie donnent les bons crédits

-- ========================================
-- 1. VÉRIFIER LES PLANS BOUTIQUE
-- ========================================

SELECT 
  '📊 PLANS BOUTIQUE DISPONIBLES' as titre,
  name as plan,
  price as prix_euro,
  credits_amount as credits_inclus,
  CONCAT(
    'Achat ', name, ' à ', price, '€ = +', credits_amount, ' crédits'
  ) as simulation_achat
FROM shop_items
WHERE item_type = 'subscription' AND is_active = true
ORDER BY price;

-- ========================================
-- 2. VÉRIFIER LES TRANSACTIONS RÉCENTES
-- ========================================

-- Voir les 10 dernières transactions
SELECT 
  t.id,
  t.user_id,
  p.email as utilisateur,
  t.amount as montant_euro,
  t.credits as credits_achetes,
  t.payment_status as statut_paiement,
  t.payment_id as id_paiement_mollie,
  t.created_at as date_achat
FROM transactions t
LEFT JOIN profiles p ON p.id = t.user_id
ORDER BY t.created_at DESC
LIMIT 10;

-- ========================================
-- 3. VÉRIFIER LES ABONNEMENTS ACTIFS
-- ========================================

SELECT 
  s.id,
  p.email as utilisateur,
  s.plan as plan_abonne,
  s.status as statut,
  s.payment_method as methode_paiement,
  s.current_period_start as debut,
  s.current_period_end as fin,
  CASE 
    WHEN s.current_period_end > NOW() THEN '✅ Actif'
    ELSE '⏳ Expiré'
  END as validite
FROM subscriptions s
LEFT JOIN profiles p ON p.id = s.user_id
ORDER BY s.created_at DESC
LIMIT 10;

-- ========================================
-- 4. VÉRIFIER L'HISTORIQUE DES CRÉDITS
-- ========================================

-- Voir les mouvements de crédits récents
SELECT 
  ct.id,
  p.email as utilisateur,
  ct.amount as credits_mouvement,
  ct.transaction_type as type,
  ct.description as description,
  ct.created_at as date
FROM credit_transactions ct
LEFT JOIN profiles p ON p.id = ct.user_id
ORDER BY ct.created_at DESC
LIMIT 20;

-- ========================================
-- 5. VÉRIFIER COHÉRENCE ACHATS → CRÉDITS
-- ========================================

-- Comparer les achats Mollie avec les crédits reçus
SELECT 
  '🔍 VÉRIFICATION COHÉRENCE' as test,
  t.id as transaction_id,
  p.email as utilisateur,
  t.credits as credits_transaction,
  si.credits_amount as credits_plan,
  si.name as plan_achete,
  t.payment_status as statut,
  CASE 
    WHEN t.credits = si.credits_amount THEN '✅ Correct'
    ELSE '❌ INCOHÉRENCE DÉTECTÉE'
  END as verification
FROM transactions t
LEFT JOIN profiles p ON p.id = t.user_id
LEFT JOIN shop_items si ON si.id::text = t.package_id::text
WHERE t.payment_status = 'paid'
ORDER BY t.created_at DESC
LIMIT 10;

-- ========================================
-- 6. SIMULER UN ACHAT MOLLIE
-- ========================================

-- SIMULATION: Si quelqu'un achète PRO à 49.99€
SELECT 
  '💳 SIMULATION ACHAT PRO' as scenario,
  name as plan,
  price as prix_paye,
  credits_amount as credits_a_recevoir,
  CONCAT(
    'Client paie ', price, '€ via Mollie',
    ' → Webhook reçoit payment_id',
    ' → Ajoute ', credits_amount, ' crédits dans user_credits',
    ' → Balance finale = balance_actuelle + ', credits_amount
  ) as flux_attendu
FROM shop_items
WHERE name = 'pro' AND item_type = 'subscription';

-- ========================================
-- 7. VÉRIFIER UN UTILISATEUR SPÉCIFIQUE
-- ========================================

-- Remplacez 'email@example.com' par votre email de test
SELECT 
  '👤 DÉTAILS UTILISATEUR' as titre,
  p.email,
  uc.balance as credits_actuels,
  s.plan as abonnement_actif,
  s.status as statut_abonnement,
  s.current_period_end as expiration
FROM profiles p
LEFT JOIN user_credits uc ON uc.user_id = p.id
LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
WHERE p.email = 'VOTRE_EMAIL_TEST'  -- ⚠️ REMPLACEZ ICI
LIMIT 1;

-- ========================================
-- 8. TEST: VÉRIFIER WEBHOOK MOLLIE
-- ========================================

-- Ce que le webhook Mollie DOIT faire:
-- 1. Recevoir payment_id de Mollie
-- 2. Lire metadata.credits du paiement
-- 3. Ajouter les crédits dans user_credits.balance

-- Vérifier que le webhook a bien ajouté les crédits
SELECT 
  '🔔 WEBHOOK MOLLIE - Dernières additions de crédits' as test,
  ct.user_id,
  p.email,
  ct.amount as credits_ajoutes,
  ct.description,
  ct.created_at,
  CASE 
    WHEN ct.description LIKE '%Mollie%' OR ct.description LIKE '%payment%' THEN '✅ Via Mollie'
    WHEN ct.description LIKE '%Abonnement%' THEN '✅ Via Admin'
    ELSE '📝 Autre'
  END as source
FROM credit_transactions ct
LEFT JOIN profiles p ON p.id = ct.user_id
WHERE ct.transaction_type = 'credit'
ORDER BY ct.created_at DESC
LIMIT 10;

-- ========================================
-- 9. MATRICE DE VÉRIFICATION COMPLÈTE
-- ========================================

-- Pour chaque plan, vérifier les valeurs attendues
SELECT 
  name as plan,
  price as prix,
  credits_amount as credits,
  -- Vérifications
  CASE WHEN name = 'starter' AND credits_amount = 10 THEN '✅' ELSE '❌' END as check_starter,
  CASE WHEN name = 'basic' AND credits_amount = 25 THEN '✅' ELSE '❌' END as check_basic,
  CASE WHEN name = 'pro' AND credits_amount = 100 THEN '✅' ELSE '❌' END as check_pro,
  CASE WHEN name = 'business' AND credits_amount = 500 THEN '✅' ELSE '❌' END as check_business,
  CASE WHEN name = 'enterprise' AND credits_amount = 1500 THEN '✅' ELSE '❌' END as check_enterprise
FROM shop_items
WHERE item_type = 'subscription' AND is_active = true
ORDER BY price;

-- ========================================
-- 10. RÉSUMÉ FINAL
-- ========================================

SELECT '
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🧪 TEST MOLLIE - ACHATS ABONNEMENTS                     ║
║                                                            ║
║   📋 Que vérifier:                                         ║
║                                                            ║
║   1️⃣ shop_items a les bons crédits (10,25,100,500,1500)  ║
║   2️⃣ transactions enregistre les achats Mollie            ║
║   3️⃣ subscriptions crée les abonnements actifs            ║
║   4️⃣ credit_transactions trace les ajouts de crédits      ║
║   5️⃣ user_credits.balance est mis à jour                  ║
║                                                            ║
║   🔄 Flux Mollie attendu:                                  ║
║   Client paie → Mollie webhook → user_credits.balance     ║
║                                                            ║
║   ⚠️ Si incohérence détectée:                             ║
║   - Vérifier supabase/functions/mollie-webhook/index.ts  ║
║   - Vérifier que la colonne est "balance" pas "credits"  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
' as MESSAGE;

-- ========================================
-- 11. COMMANDE POUR TESTER MANUELLEMENT
-- ========================================

-- Pour tester l'ajout de crédits (simule un achat Mollie):
-- SELECT add_credits(
--   'USER_ID'::UUID,
--   100,  -- Nombre de crédits (ex: plan PRO)
--   'Test achat PRO via Mollie - 49.99€'
-- );

-- Pour vérifier le solde après:
-- SELECT balance FROM user_credits WHERE user_id = 'USER_ID';
