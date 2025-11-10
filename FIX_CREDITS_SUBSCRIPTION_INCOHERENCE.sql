-- ============================================
-- FIX INCOHÉRENCE SYSTÈME CRÉDITS/ABONNEMENTS
-- ============================================
-- Problème : useCredits lit profiles.credits mais useSubscription lit user_credits.balance
-- Solution : Unifier sur profiles.credits comme source unique de vérité

-- 1. Synchroniser user_credits.balance → profiles.credits
DO $$ 
DECLARE
    v_sync_count INTEGER;
BEGIN
    WITH sync_data AS (
        SELECT 
            p.id,
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

-- 2. Créer fonction pour attribuer crédits mensuels aux abonnements actifs
CREATE OR REPLACE FUNCTION distribute_subscription_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_sub RECORD;
BEGIN
    -- Récupérer tous les abonnements actifs non expirés
    FOR v_sub IN 
        SELECT 
            s.id,
            s.user_id,
            s.plan,
            s.current_period_end,
            CASE s.plan
                WHEN 'free' THEN 0
                WHEN 'starter' THEN 10
                WHEN 'basic' THEN 25        -- 19.99€/mois
                WHEN 'pro' THEN 100         -- 49.99€/mois
                WHEN 'business' THEN 500    -- 79.99€/mois
                WHEN 'enterprise' THEN 500  -- 79.99€/mois
                ELSE 0
            END as monthly_credits
        FROM subscriptions s
        WHERE s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
        AND s.plan != 'free'
    LOOP
        -- Ajouter les crédits mensuels dans profiles
        UPDATE profiles
        SET credits = COALESCE(credits, 0) + v_sub.monthly_credits
        WHERE id = v_sub.user_id;
        
        -- Synchroniser user_credits
        UPDATE user_credits
        SET balance = COALESCE(balance, 0) + v_sub.monthly_credits
        WHERE user_id = v_sub.user_id;
        
        -- Si user_credits n'existe pas, créer
        INSERT INTO user_credits (user_id, balance)
        VALUES (v_sub.user_id, v_sub.monthly_credits)
        ON CONFLICT (user_id) DO NOTHING;
        
        v_count := v_count + 1;
        
        RAISE NOTICE 'Ajouté % crédits à user % (plan %)', v_sub.monthly_credits, v_sub.user_id, v_sub.plan;
    END LOOP;
    
    RAISE NOTICE 'Distribution terminée : % abonnements traités', v_count;
END;
$$;

-- 3. Créer trigger pour synchroniser automatiquement profiles.credits ↔ user_credits.balance
CREATE OR REPLACE FUNCTION sync_credits_bidirectional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_TABLE_NAME = 'profiles' THEN
        -- profiles.credits modifié → mettre à jour user_credits.balance
        UPDATE user_credits
        SET balance = NEW.credits
        WHERE user_id = NEW.id;
        
        -- Si user_credits n'existe pas, créer
        IF NOT FOUND THEN
            INSERT INTO user_credits (user_id, balance)
            VALUES (NEW.id, NEW.credits)
            ON CONFLICT (user_id) DO UPDATE SET balance = NEW.credits;
        END IF;
        
    ELSIF TG_TABLE_NAME = 'user_credits' THEN
        -- user_credits.balance modifié → mettre à jour profiles.credits
        UPDATE profiles
        SET credits = NEW.balance
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop triggers si existent déjà
DROP TRIGGER IF EXISTS sync_profile_credits_to_user_credits ON profiles;
DROP TRIGGER IF EXISTS sync_user_credits_to_profile ON user_credits;

-- Créer triggers bidirectionnels
CREATE TRIGGER sync_profile_credits_to_user_credits
AFTER UPDATE OF credits ON profiles
FOR EACH ROW
WHEN (OLD.credits IS DISTINCT FROM NEW.credits)
EXECUTE FUNCTION sync_credits_bidirectional();

CREATE TRIGGER sync_user_credits_to_profile
AFTER UPDATE OF balance ON user_credits
FOR EACH ROW
WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
EXECUTE FUNCTION sync_credits_bidirectional();

-- 4. Vérifier les abonnements actifs
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
    
    -- Marquer abonnements expirés
    IF v_expired_count > 0 THEN
        UPDATE subscriptions
        SET status = 'expired'
        WHERE status = 'active' 
        AND current_period_end < NOW();
        
        RAISE NOTICE 'Marqué % abonnements comme expirés', v_expired_count;
    END IF;
    
    RAISE NOTICE 'Abonnements actifs: %', v_active_count;
    RAISE NOTICE 'Abonnements expirés: %', v_expired_count;
END $$;

-- 5. Distribuer les crédits mensuels maintenant
SELECT distribute_subscription_credits();

-- 6. Vérification finale
DO $$ 
DECLARE
    v_user RECORD;
BEGIN
    RAISE NOTICE '=== VÉRIFICATION FINALE ===';
    
    FOR v_user IN 
        SELECT 
            p.id,
            p.email,
            p.credits as profile_credits,
            COALESCE(uc.balance, 0) as user_credits_balance,
            s.plan,
            s.status as sub_status,
            s.current_period_end
        FROM profiles p
        LEFT JOIN user_credits uc ON uc.user_id = p.id
        LEFT JOIN subscriptions s ON s.user_id = p.id
        ORDER BY p.created_at DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'User: % | Crédits: % | Abonnement: % (%) | Expire: %', 
            v_user.email, 
            v_user.profile_credits, 
            v_user.plan, 
            v_user.sub_status,
            v_user.current_period_end;
    END LOOP;
END $$;

-- 7. Créer une fonction pour renouveler MANUELLEMENT les crédits (à appeler par admin)
CREATE OR REPLACE FUNCTION renew_user_credits(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan text;
    v_credits_to_add integer;
    v_result json;
BEGIN
    -- Récupérer le plan de l'utilisateur
    SELECT plan INTO v_plan
    FROM subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > NOW());
    
    IF v_plan IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Aucun abonnement actif'
        );
    END IF;
    
    -- Calculer les crédits selon le plan
    v_credits_to_add := CASE v_plan
        WHEN 'starter' THEN 10
        WHEN 'basic' THEN 25        -- 19.99€/mois
        WHEN 'pro' THEN 100         -- 49.99€/mois
        WHEN 'business' THEN 500    -- 79.99€/mois
        WHEN 'enterprise' THEN 500  -- 79.99€/mois
        ELSE 0
    END;
    
    IF v_credits_to_add = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Plan ne donne pas de crédits'
        );
    END IF;
    
    -- Ajouter les crédits
    UPDATE profiles
    SET credits = COALESCE(credits, 0) + v_credits_to_add
    WHERE id = p_user_id;
    
    -- Synchroniser user_credits
    INSERT INTO user_credits (user_id, balance)
    VALUES (p_user_id, v_credits_to_add)
    ON CONFLICT (user_id) 
    DO UPDATE SET balance = user_credits.balance + v_credits_to_add;
    
    RETURN json_build_object(
        'success', true,
        'plan', v_plan,
        'credits_added', v_credits_to_add
    );
END;
$$;

COMMENT ON FUNCTION distribute_subscription_credits() IS 'Distribue les crédits mensuels à tous les abonnements actifs (à appeler via cron)';
COMMENT ON FUNCTION renew_user_credits(uuid) IS 'Renouvelle manuellement les crédits d''un utilisateur selon son plan';

-- ============================================
-- RÉSUMÉ DES CORRECTIONS
-- ============================================
-- ✅ Synchronisé profiles.credits avec user_credits.balance
-- ✅ Créé triggers bidirectionnels pour maintenir la cohérence
-- ✅ Créé fonction distribute_subscription_credits() pour renouveler automatiquement
-- ✅ Créé fonction renew_user_credits(user_id) pour renouvellement manuel
-- ✅ Marqué les abonnements expirés
-- ✅ Distribué les crédits aux abonnements actifs

-- PROCHAINES ÉTAPES :
-- 1. Configurer un cron job pour appeler distribute_subscription_credits() tous les 30 jours
-- 2. Ou appeler manuellement SELECT distribute_subscription_credits(); quand nécessaire
