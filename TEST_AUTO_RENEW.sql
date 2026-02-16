-- ============================================
-- VÉRIFIER LE SYSTÈME AUTO-RENEW
-- ============================================

-- 1. Voir le statut auto_renew de tous les utilisateurs
SELECT * FROM admin_auto_renew_status;

-- 2. Tester la distribution (NE distribue QUE aux auto_renew = true)
SELECT * FROM distribute_subscription_credits();

-- 3. Tester toggle pour UN utilisateur spécifique
-- Remplacez 'USER_ID_HERE' par un vrai UUID
-- SELECT toggle_auto_renew('USER_ID_HERE', false);

-- 4. Vérifier la colonne auto_renew existe bien
SELECT 
    email,
    plan,
    status,
    auto_renew,
    CASE 
        WHEN auto_renew THEN '⚡ AUTO'
        ELSE '⏸️ MANUEL'
    END as mode_renouvellement
FROM subscriptions s
JOIN profiles p ON p.id = s.user_id
WHERE s.status = 'active'
ORDER BY s.auto_renew DESC, s.plan DESC;
