-- ============================================
-- TEST DISTRIBUTION CRÉDITS
-- ============================================

-- 1. Afficher les abonnements actifs AVANT distribution
SELECT 
    '=== AVANT DISTRIBUTION ===' as status,
    p.email,
    p.credits as credits_actuels,
    s.plan,
    s.status as sub_status,
    s.current_period_end,
    CASE s.plan
        WHEN 'basic' THEN 25
        WHEN 'pro' THEN 100
        WHEN 'business' THEN 500
        WHEN 'enterprise' THEN 500
        ELSE 0
    END as credits_a_ajouter
FROM profiles p
JOIN subscriptions s ON s.user_id = p.id
WHERE s.status = 'active'
AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
ORDER BY p.created_at DESC;

-- 2. Exécuter la distribution
SELECT distribute_subscription_credits();

-- 3. Afficher les résultats APRÈS distribution
SELECT 
    '=== APRÈS DISTRIBUTION ===' as status,
    p.email,
    p.credits as nouveaux_credits,
    s.plan,
    s.status as sub_status
FROM profiles p
JOIN subscriptions s ON s.user_id = p.id
WHERE s.status = 'active'
AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
ORDER BY p.created_at DESC;

-- 4. Vérifier la synchronisation profiles ↔ user_credits
SELECT 
    '=== VÉRIFICATION SYNC ===' as status,
    p.email,
    p.credits as profile_credits,
    uc.balance as user_credits_balance,
    CASE 
        WHEN p.credits = uc.balance THEN '✅ OK'
        ELSE '❌ DÉSYNCHRONISÉ'
    END as sync_status
FROM profiles p
LEFT JOIN user_credits uc ON uc.user_id = p.id
WHERE p.credits IS NOT NULL OR uc.balance IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;
