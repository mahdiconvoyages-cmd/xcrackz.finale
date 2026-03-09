-- ============================================================================
-- FIX: assign_credits_for_plan() trigger V2
-- 
-- Corrections:
--   1. Reads credits from shop_items (single source of truth) instead of hardcoded CASE
--   2. Syncs BOTH profiles.credits AND user_credits.balance (was missing profiles sync in migration)
--   3. Graceful fallback for enterprise/unknown plans (0 credits, admin overrides manually)
--   4. Non-cumulative: resets credits (does not add)
--
-- Note: For admin_manual attribution, the admin code also sets credits AFTER 
--       this trigger fires, ensuring enterprise custom credits override properly.
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_credits_for_plan()
RETURNS TRIGGER AS $$
DECLARE
  v_credit_amount INTEGER;
BEGIN
  IF NEW.status = 'active' THEN
    -- Read credit amount from shop_items (single source of truth)
    SELECT credits_amount INTO v_credit_amount
    FROM shop_items
    WHERE item_type = 'subscription'
    AND name = NEW.plan
    AND is_active = true
    LIMIT 1;

    -- Default to 0 if plan not found (e.g. enterprise sur mesure)
    IF v_credit_amount IS NULL THEN
      v_credit_amount := 0;
    END IF;

    -- Only set credits if amount > 0 (enterprise = 0, admin overrides manually after)
    IF v_credit_amount > 0 THEN
      -- Sync user_credits table (non-cumulative reset)
      INSERT INTO user_credits (user_id, balance)
      VALUES (NEW.user_id, v_credit_amount)
      ON CONFLICT (user_id)
      DO UPDATE SET balance = v_credit_amount;

      -- Sync profiles.credits
      UPDATE profiles
      SET credits = v_credit_amount
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS assign_credits_on_subscription ON subscriptions;
CREATE TRIGGER assign_credits_on_subscription
  AFTER INSERT OR UPDATE OF plan, status ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION assign_credits_for_plan();

-- Also fix distribute_subscription_credits() to use shop_items
CREATE OR REPLACE FUNCTION distribute_subscription_credits()
RETURNS TABLE(user_email text, plan text, credits_added integer, auto_renew boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
    v_credit_amount INTEGER;
BEGIN
    FOR v_sub IN 
        SELECT 
            s.id,
            s.user_id,
            s.plan,
            s.auto_renew,
            s.current_period_end,
            p.email
        FROM subscriptions s
        JOIN profiles p ON p.id = s.user_id
        WHERE s.status = 'active'
        AND s.auto_renew = true
        AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
        AND s.plan != 'free'
    LOOP
        -- Read credits from shop_items
        SELECT credits_amount INTO v_credit_amount
        FROM shop_items
        WHERE item_type = 'subscription'
        AND name = v_sub.plan
        AND is_active = true
        LIMIT 1;

        IF v_credit_amount IS NULL OR v_credit_amount = 0 THEN
            CONTINUE;
        END IF;

        -- Réinitialiser les crédits (non cumulables)
        UPDATE profiles 
        SET credits = v_credit_amount
        WHERE id = v_sub.user_id;

        -- Sync user_credits
        INSERT INTO user_credits (user_id, balance)
        VALUES (v_sub.user_id, v_credit_amount)
        ON CONFLICT (user_id)
        DO UPDATE SET balance = v_credit_amount;

        -- Logger la transaction
        INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
        VALUES (
            v_sub.user_id,
            v_credit_amount,
            'addition',
            'Renouvellement crédits — plan ' || UPPER(v_sub.plan),
            v_credit_amount
        );

        RETURN QUERY SELECT 
            v_sub.email::text, 
            v_sub.plan::text, 
            v_credit_amount::integer, 
            v_sub.auto_renew::boolean;
    END LOOP;
END;
$$;

SELECT 'Trigger V2 + distribute_subscription_credits() mis à jour avec succès' as result;
