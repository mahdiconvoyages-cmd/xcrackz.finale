-- ============================================
-- VÉRIFIER ABONNEMENTS ACTIFS
-- ============================================

-- Voir qui a un abonnement actif
SELECT 
    p.email,
    p.credits as credits_actuels,
    s.plan,
    s.status,
    s.current_period_end,
    CASE 
        WHEN s.current_period_end IS NULL THEN '♾️ ILLIMITÉ'
        WHEN s.current_period_end > NOW() THEN '✅ ACTIF (' || EXTRACT(DAY FROM (s.current_period_end - NOW())) || ' jours restants)'
        ELSE '❌ EXPIRÉ'
    END as statut_expiration,
    CASE s.plan
        WHEN 'basic' THEN 25
        WHEN 'pro' THEN 100
        WHEN 'business' THEN 500
        WHEN 'enterprise' THEN 500
        ELSE 0
    END as credits_mensuels
FROM profiles p
JOIN subscriptions s ON s.user_id = p.id
WHERE s.status = 'active'
ORDER BY s.current_period_end DESC NULLS FIRST;

-- Si aucun résultat ci-dessus, vérifier TOUS les abonnements
SELECT 
    '=== TOUS LES ABONNEMENTS ===' as info,
    p.email,
    s.plan,
    s.status,
    s.current_period_end
FROM profiles p
LEFT JOIN subscriptions s ON s.user_id = p.id
WHERE s.id IS NOT NULL
ORDER BY s.created_at DESC;
