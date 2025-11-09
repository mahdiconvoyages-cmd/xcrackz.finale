-- ============================================
-- FIX: Dashboard Mobile - Crédits et Abonnement
-- ============================================

-- 1. Vérifier et initialiser credits dans profiles
DO $$ 
DECLARE
    v_count INTEGER;
BEGIN
    -- Compter utilisateurs sans crédits initialisés
    SELECT COUNT(*) INTO v_count
    FROM profiles
    WHERE credits IS NULL;
    
    IF v_count > 0 THEN
        UPDATE profiles 
        SET credits = 0 
        WHERE credits IS NULL;
        RAISE NOTICE 'Initialisé credits pour % utilisateurs', v_count;
    ELSE
        RAISE NOTICE 'Tous les utilisateurs ont déjà des crédits initialisés';
    END IF;
END $$;

-- 2. Synchroniser profiles.credits avec user_credits.balance (si différent)
DO $$ 
DECLARE
    v_sync_count INTEGER := 0;
BEGIN
    -- Mettre à jour profiles.credits depuis user_credits.balance
    WITH sync_data AS (
        SELECT 
            p.id,
            p.credits as profile_credits,
            COALESCE(uc.balance, 0) as user_credits_balance
        FROM profiles p
        LEFT JOIN user_credits uc ON uc.user_id = p.id
        WHERE COALESCE(p.credits, 0) != COALESCE(uc.balance, 0)
    )
    UPDATE profiles p
    SET credits = sd.user_credits_balance
    FROM sync_data sd
    WHERE p.id = sd.id;
    
    GET DIAGNOSTICS v_sync_count = ROW_COUNT;
    
    IF v_sync_count > 0 THEN
        RAISE NOTICE 'Synchronisé % profils avec user_credits', v_sync_count;
    ELSE
        RAISE NOTICE 'Tous les profils sont déjà synchronisés';
    END IF;
END $$;

-- 3. Vérifier les abonnements actifs
DO $$ 
DECLARE
    v_active_count INTEGER;
    v_expired_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_count
    FROM subscriptions
    WHERE status = 'active' 
    AND (current_period_end IS NULL OR current_period_end > NOW());
    
    SELECT COUNT(*) INTO v_expired_count
    FROM subscriptions
    WHERE status = 'active' 
    AND current_period_end < NOW();
    
    -- Mettre à jour abonnements expirés
    IF v_expired_count > 0 THEN
        UPDATE subscriptions
        SET status = 'expired'
        WHERE status = 'active' 
        AND current_period_end < NOW();
        
        RAISE NOTICE 'Marqué % abonnements comme expirés', v_expired_count;
    END IF;
    
    RAISE NOTICE 'Abonnements actifs: %', v_active_count;
END $$;

-- 4. Créer trigger pour synchroniser automatiquement user_credits → profiles
CREATE OR REPLACE FUNCTION sync_profile_credits_from_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Mettre à jour profiles.credits quand user_credits.balance change
    UPDATE profiles
    SET credits = NEW.balance
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$;

-- Drop trigger si existe déjà
DROP TRIGGER IF EXISTS trigger_sync_profile_credits ON user_credits;

-- Créer trigger
CREATE TRIGGER trigger_sync_profile_credits
    AFTER INSERT OR UPDATE OF balance ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_credits_from_user_credits();

-- 5. Rapport final
DO $$ 
DECLARE
    v_total_users INTEGER;
    v_users_with_credits INTEGER;
    v_total_credits INTEGER;
    v_active_subs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM profiles;
    
    SELECT COUNT(*) INTO v_users_with_credits 
    FROM profiles WHERE credits > 0;
    
    SELECT COALESCE(SUM(credits), 0) INTO v_total_credits 
    FROM profiles;
    
    SELECT COUNT(*) INTO v_active_subs 
    FROM subscriptions 
    WHERE status = 'active';
    
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '📊 RAPPORT SYSTÈME CRÉDITS';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE 'Total utilisateurs: %', v_total_users;
    RAISE NOTICE 'Utilisateurs avec crédits: %', v_users_with_credits;
    RAISE NOTICE 'Total crédits système: %', v_total_credits;
    RAISE NOTICE 'Abonnements actifs: %', v_active_subs;
    RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- 6. Exemple de requête pour débug utilisateur spécifique
-- Décommenter et remplacer YOUR_USER_ID pour tester
/*
DO $$ 
DECLARE
    v_user_id UUID := 'YOUR_USER_ID'; -- Remplacer par ID réel
    v_profile_credits INTEGER;
    v_user_credits_balance INTEGER;
    v_subscription_info TEXT;
BEGIN
    SELECT credits INTO v_profile_credits
    FROM profiles WHERE id = v_user_id;
    
    SELECT balance INTO v_user_credits_balance
    FROM user_credits WHERE user_id = v_user_id;
    
    SELECT CONCAT(plan_name, ' (', status, ')') INTO v_subscription_info
    FROM subscriptions 
    WHERE user_id = v_user_id 
    AND status = 'active'
    LIMIT 1;
    
    RAISE NOTICE '👤 USER: %', v_user_id;
    RAISE NOTICE '💳 profiles.credits: %', COALESCE(v_profile_credits, 0);
    RAISE NOTICE '💰 user_credits.balance: %', COALESCE(v_user_credits_balance, 0);
    RAISE NOTICE '📦 Abonnement: %', COALESCE(v_subscription_info, 'Aucun');
END $$;
*/
