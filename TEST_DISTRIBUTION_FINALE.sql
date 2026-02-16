-- ============================================
-- TEST DISTRIBUTION AVEC VOS ABONNEMENTS
-- ============================================

-- 1. ÉTAT ACTUEL
SELECT 
    '1️⃣ AVANT DISTRIBUTION' as etape,
    p.email,
    p.credits as credits_avant,
    s.plan,
    CASE s.plan
        WHEN 'starter' THEN 10
        WHEN 'basic' THEN 25
        WHEN 'pro' THEN 100
        WHEN 'business' THEN 500
        WHEN 'enterprise' THEN 500
    END as credits_a_ajouter,
    p.credits + CASE s.plan
        WHEN 'starter' THEN 10
        WHEN 'basic' THEN 25
        WHEN 'pro' THEN 100
        WHEN 'business' THEN 500
        WHEN 'enterprise' THEN 500
    END as credits_apres_calcul
FROM profiles p
JOIN subscriptions s ON s.user_id = p.id
WHERE s.status = 'active'
AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
ORDER BY s.plan DESC, p.email;

-- 2. EXÉCUTER LA DISTRIBUTION
SELECT distribute_subscription_credits();

-- 3. VÉRIFIER LES NOUVEAUX SOLDES
SELECT 
    '2️⃣ APRÈS DISTRIBUTION' as etape,
    p.email,
    p.credits as nouveaux_credits,
    s.plan,
    uc.balance as user_credits_balance,
    CASE WHEN p.credits = uc.balance THEN '✅' ELSE '❌' END as sync_ok
FROM profiles p
JOIN subscriptions s ON s.user_id = p.id
LEFT JOIN user_credits uc ON uc.user_id = p.id
WHERE s.status = 'active'
AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
ORDER BY s.plan DESC, p.email;

-- 4. CALCUL TOTAL DISTRIBUÉ
SELECT 
    '3️⃣ RÉSUMÉ' as etape,
    COUNT(*) as nb_abonnements_traites,
    SUM(CASE s.plan
        WHEN 'starter' THEN 10
        WHEN 'basic' THEN 25
        WHEN 'pro' THEN 100
        WHEN 'business' THEN 500
        WHEN 'enterprise' THEN 500
    END) as total_credits_distribues
FROM subscriptions s
WHERE s.status = 'active'
AND (s.current_period_end IS NULL OR s.current_period_end > NOW());
