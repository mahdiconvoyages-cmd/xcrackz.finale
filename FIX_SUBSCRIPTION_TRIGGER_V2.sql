-- ============================================================================
-- FIX V3: Subscription Credits System
-- 
-- Architecture:
--   - credits_per_period column on subscriptions = how many credits per cycle
--   - credits_renewed_at = last time credits were renewed
--   - For standard plans (pro/business/premium): credits_per_period is set from shop_items
--   - For enterprise: credits_per_period is set manually by admin (custom amount)
--   - Trigger assign_credits_for_plan() reads credits_per_period (NOT shop_items)
--   - Credits renew every 30 days (non-cumulative reset)
--   - Runs as SECURITY DEFINER (bypasses RLS)
-- ============================================================================

-- 1) Add credits_per_period and credits_renewed_at columns
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS credits_per_period INTEGER DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS credits_renewed_at TIMESTAMPTZ DEFAULT NOW();

-- 2) Backfill credits_per_period from shop_items for existing active subscriptions
UPDATE public.subscriptions s
SET credits_per_period = COALESCE(
  (SELECT si.credits_amount FROM shop_items si 
   WHERE si.item_type = 'subscription' AND si.name = s.plan AND si.is_active = true LIMIT 1),
  0
)
WHERE s.status = 'active' AND s.credits_per_period = 0 AND s.plan != 'enterprise';

-- 3) Trigger: assign credits when subscription is created/updated
CREATE OR REPLACE FUNCTION assign_credits_for_plan()
RETURNS TRIGGER AS $$
DECLARE
  v_credit_amount INTEGER;
BEGIN
  IF NEW.status = 'active' THEN
    -- Use credits_per_period from the subscription itself (set by admin code)
    v_credit_amount := COALESCE(NEW.credits_per_period, 0);

    -- Fallback: if credits_per_period is 0 and NOT enterprise, read from shop_items
    IF v_credit_amount = 0 AND NEW.plan != 'enterprise' THEN
      SELECT credits_amount INTO v_credit_amount
      FROM shop_items
      WHERE item_type = 'subscription'
      AND name = NEW.plan
      AND is_active = true
      LIMIT 1;
      v_credit_amount := COALESCE(v_credit_amount, 0);
    END IF;

    IF v_credit_amount > 0 THEN
      -- Sync user_credits (non-cumulative reset)
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

-- Recreate trigger (include credits_per_period changes)
DROP TRIGGER IF EXISTS assign_credits_on_subscription ON subscriptions;
CREATE TRIGGER assign_credits_on_subscription
  AFTER INSERT OR UPDATE OF plan, status, credits_per_period ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION assign_credits_for_plan();

-- 4) Monthly credit renewal function (call via pg_cron or external scheduler)
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
            s.credits_per_period,
            s.credits_renewed_at,
            s.current_period_end,
            p.email
        FROM subscriptions s
        JOIN profiles p ON p.id = s.user_id
        WHERE s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
        AND s.plan != 'free'
        -- Only renew if 30+ days since last renewal
        AND (s.credits_renewed_at IS NULL OR s.credits_renewed_at < NOW() - INTERVAL '30 days')
    LOOP
        v_credit_amount := COALESCE(v_sub.credits_per_period, 0);

        -- Fallback to shop_items if credits_per_period not set
        IF v_credit_amount = 0 AND v_sub.plan != 'enterprise' THEN
          SELECT credits_amount INTO v_credit_amount
          FROM shop_items
          WHERE item_type = 'subscription'
          AND name = v_sub.plan
          AND is_active = true
          LIMIT 1;
        END IF;

        IF v_credit_amount IS NULL OR v_credit_amount = 0 THEN
            CONTINUE;
        END IF;

        -- Reset credits (non-cumulative)
        UPDATE profiles SET credits = v_credit_amount WHERE id = v_sub.user_id;

        INSERT INTO user_credits (user_id, balance)
        VALUES (v_sub.user_id, v_credit_amount)
        ON CONFLICT (user_id)
        DO UPDATE SET balance = v_credit_amount;

        -- Log transaction
        INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
        VALUES (
            v_sub.user_id,
            v_credit_amount,
            'addition',
            'Renouvellement crédits 30j — plan ' || UPPER(v_sub.plan),
            v_credit_amount
        );

        -- Mark renewal timestamp
        UPDATE subscriptions SET credits_renewed_at = NOW() WHERE id = v_sub.id;

        RETURN QUERY SELECT 
            v_sub.email::text, 
            v_sub.plan::text, 
            v_credit_amount::integer, 
            v_sub.auto_renew::boolean;
    END LOOP;
END;
$$;

-- 5) Schedule monthly credit renewal (if pg_cron available)
-- SELECT cron.schedule('renew-credits-monthly', '0 3 * * *', 'SELECT * FROM distribute_subscription_credits()');

SELECT 'V3: credits_per_period + 30-day renewal system deployed' as result;
