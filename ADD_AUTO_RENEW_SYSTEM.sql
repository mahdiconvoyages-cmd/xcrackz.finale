-- ============================================
-- SYSTÈME DE RENOUVELLEMENT AUTOMATIQUE
-- ============================================

-- 1. Ajouter colonne auto_renew dans subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;

-- 2. Mettre à jour distribute_subscription_credits() pour respecter auto_renew
-- Supprimer l'ancienne fonction d'abord (car on change le type de retour)
DROP FUNCTION IF EXISTS distribute_subscription_credits();

CREATE OR REPLACE FUNCTION distribute_subscription_credits()
RETURNS TABLE(
    user_email text,
    plan text,
    credits_added integer,
    auto_renew boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_sub RECORD;
BEGIN
    -- Créer une table temporaire pour les résultats
    CREATE TEMP TABLE IF NOT EXISTS temp_distribution_results (
        user_email text,
        plan text,
        credits_added integer,
        auto_renew boolean
    ) ON COMMIT DROP;

    -- Récupérer tous les abonnements actifs avec auto_renew = true
    FOR v_sub IN 
        SELECT 
            s.id,
            s.user_id,
            s.plan,
            s.auto_renew,
            s.current_period_end,
            p.email,
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
        JOIN profiles p ON p.id = s.user_id
        WHERE s.status = 'active'
        AND s.auto_renew = true  -- NOUVEAU : Seulement si auto_renew activé
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
        
        -- Ajouter au résultat
        INSERT INTO temp_distribution_results VALUES (
            v_sub.email,
            v_sub.plan,
            v_sub.monthly_credits,
            v_sub.auto_renew
        );
        
        v_count := v_count + 1;
        
        RAISE NOTICE 'Ajouté % crédits à % (plan: %, auto_renew: true)', 
            v_sub.monthly_credits, v_sub.email, v_sub.plan;
    END LOOP;
    
    RAISE NOTICE 'Distribution terminée : % abonnements traités', v_count;
    
    -- Retourner les résultats
    RETURN QUERY SELECT * FROM temp_distribution_results;
END;
$$;

-- 3. Créer fonction pour activer/désactiver auto_renew
CREATE OR REPLACE FUNCTION toggle_auto_renew(p_user_id uuid, p_enable boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription_id uuid;
    v_plan text;
    v_email text;
BEGIN
    -- Récupérer l'abonnement actif
    SELECT s.id, s.plan, p.email
    INTO v_subscription_id, v_plan, v_email
    FROM subscriptions s
    JOIN profiles p ON p.id = s.user_id
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > NOW());
    
    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Aucun abonnement actif trouvé'
        );
    END IF;
    
    -- Mettre à jour auto_renew
    UPDATE subscriptions
    SET auto_renew = p_enable
    WHERE id = v_subscription_id;
    
    RETURN json_build_object(
        'success', true,
        'user_id', p_user_id,
        'email', v_email,
        'plan', v_plan,
        'auto_renew', p_enable,
        'message', CASE 
            WHEN p_enable THEN 'Renouvellement automatique activé'
            ELSE 'Renouvellement automatique désactivé'
        END
    );
END;
$$;

-- 4. Vue pour l'admin : voir qui a auto_renew activé
CREATE OR REPLACE VIEW admin_auto_renew_status AS
SELECT 
    p.id as user_id,
    p.email,
    s.plan,
    s.status,
    s.auto_renew,
    s.current_period_end,
    p.credits as credits_actuels,
    CASE s.plan
        WHEN 'starter' THEN 10
        WHEN 'basic' THEN 25
        WHEN 'pro' THEN 100
        WHEN 'business' THEN 500
        WHEN 'enterprise' THEN 500
        ELSE 0
    END as credits_mensuels,
    CASE 
        WHEN s.auto_renew THEN '✅ Activé'
        ELSE '❌ Désactivé'
    END as statut_auto_renew
FROM profiles p
JOIN subscriptions s ON s.user_id = p.id
WHERE s.status = 'active'
AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
ORDER BY s.auto_renew DESC, s.plan DESC, p.email;

-- 5. Activer auto_renew par défaut pour tous les abonnements existants
UPDATE subscriptions
SET auto_renew = true
WHERE status = 'active'
AND (current_period_end IS NULL OR current_period_end > NOW());

-- Vérification
SELECT 
    '=== STATUT AUTO-RENEW ===' as info,
    email,
    plan,
    auto_renew,
    CASE 
        WHEN auto_renew THEN '✅ Recevra des crédits automatiquement'
        ELSE '⏸️ Pas de renouvellement automatique'
    END as statut
FROM admin_auto_renew_status
ORDER BY auto_renew DESC, plan DESC;

COMMENT ON COLUMN subscriptions.auto_renew IS 'Si true, l''abonnement recevra automatiquement des crédits mensuels';
COMMENT ON FUNCTION toggle_auto_renew(uuid, boolean) IS 'Active/désactive le renouvellement automatique pour un utilisateur';
COMMENT ON VIEW admin_auto_renew_status IS 'Vue admin pour gérer les renouvellements automatiques';
