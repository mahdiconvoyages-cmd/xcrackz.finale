-- ============================================================================
-- FIX : Crédits NON CUMULABLES — Réinitialisation mensuelle
-- ============================================================================
-- Les crédits ne s'accumulent pas d'un mois à l'autre.
-- Chaque mois, le solde est RÉINITIALISÉ au nombre de crédits du plan.
-- Exemple : Plan Pro (20 crédits) → le 1er de chaque mois, le solde redevient 20
-- même si l'utilisateur avait encore 15 crédits restants.
-- ============================================================================

-- 1. Corriger la fonction de distribution mensuelle de crédits
CREATE OR REPLACE FUNCTION distribute_subscription_credits()
RETURNS TABLE(user_email text, plan text, credits_added integer, auto_renew boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
BEGIN
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
                WHEN 'starter' THEN 20
                WHEN 'essentiel' THEN 20
                WHEN 'basic' THEN 20
                WHEN 'pro' THEN 20          -- 20€/mois (240€/an)
                WHEN 'business' THEN 60     -- 50€/mois (600€/an)
                WHEN 'premium' THEN 150     -- 79.99€/mois (959.88€/an)
                WHEN 'enterprise' THEN 500  -- sur mesure
                ELSE 0
            END as monthly_credits
        FROM subscriptions s
        JOIN profiles p ON p.id = s.user_id
        WHERE s.status = 'active'
        AND s.auto_renew = true
        AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
        AND s.plan != 'free'
    LOOP
        -- RÉINITIALISER les crédits (non cumulables)
        UPDATE profiles 
        SET credits = v_sub.monthly_credits
        WHERE id = v_sub.user_id;

        -- Sync user_credits (réinitialisation)
        UPDATE user_credits 
        SET balance = v_sub.monthly_credits
        WHERE user_id = v_sub.user_id;

        -- Logger la transaction
        INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
        VALUES (
            v_sub.user_id,
            v_sub.monthly_credits,
            'addition',
            'Renouvellement crédits mensuels — plan ' || UPPER(v_sub.plan),
            v_sub.monthly_credits
        );

        RETURN QUERY SELECT 
            v_sub.email::text, 
            v_sub.plan::text, 
            v_sub.monthly_credits::integer, 
            v_sub.auto_renew::boolean;
    END LOOP;
END;
$$;

-- 2. Corriger la fonction d'assignation de crédits (trigger)
CREATE OR REPLACE FUNCTION assign_credits_for_plan()
RETURNS TRIGGER AS $$
DECLARE
  credit_amount INTEGER;
BEGIN
  IF NEW.status = 'active' THEN
    CASE NEW.plan
      WHEN 'free' THEN credit_amount := 0;
      WHEN 'essentiel' THEN credit_amount := 20;
      WHEN 'basic' THEN credit_amount := 20;
      WHEN 'starter' THEN credit_amount := 20;
      WHEN 'pro' THEN credit_amount := 20;
      WHEN 'business' THEN credit_amount := 60;
      WHEN 'premium' THEN credit_amount := 150;
      WHEN 'enterprise' THEN credit_amount := 500;
      ELSE credit_amount := 0;
    END CASE;

    -- RÉINITIALISER (pas cumuler)
    INSERT INTO user_credits (user_id, balance)
    VALUES (NEW.user_id, credit_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = credit_amount;

    UPDATE profiles
    SET credits = credit_amount
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Crédits non cumulables — fonctions corrigées avec succès' as result;
