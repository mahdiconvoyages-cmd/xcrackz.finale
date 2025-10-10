/*
  # Use Shop Data for Credit Assignment

  1. Changes
    - Trigger now reads credits from shop_items table
    - Dynamic credit assignment based on shop configuration
    - Admin can modify credits by updating shop_items

  2. Benefits
    - Single source of truth (shop_items)
    - Easy to modify credits without code changes
    - Consistent across the application
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS assign_credits_on_subscription ON subscriptions;
DROP FUNCTION IF EXISTS assign_credits_for_plan();

-- Create new function that uses shop_items
CREATE OR REPLACE FUNCTION assign_credits_for_plan()
RETURNS TRIGGER AS $$
DECLARE
  credit_amount INTEGER;
BEGIN
  -- Only if subscription is active
  IF NEW.status = 'active' THEN
    
    -- Get credits from shop_items table
    SELECT credits_amount INTO credit_amount
    FROM shop_items
    WHERE item_type = 'subscription'
    AND name = NEW.plan
    AND is_active = true
    LIMIT 1;

    -- If plan found in shop, use its credits
    IF credit_amount IS NOT NULL THEN
      -- FORCE update to exact amount from shop
      INSERT INTO user_credits (user_id, balance)
      VALUES (NEW.user_id, credit_amount)
      ON CONFLICT (user_id)
      DO UPDATE SET balance = credit_amount;
      
      RAISE NOTICE 'Credits set to % for user % with plan % (from shop_items)', credit_amount, NEW.user_id, NEW.plan;
    ELSE
      -- Fallback if plan not in shop (shouldn't happen)
      RAISE WARNING 'Plan % not found in shop_items, using default 10 credits', NEW.plan;
      
      INSERT INTO user_credits (user_id, balance)
      VALUES (NEW.user_id, 10)
      ON CONFLICT (user_id)
      DO UPDATE SET balance = 10;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER assign_credits_on_subscription
  AFTER INSERT OR UPDATE OF plan, status ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION assign_credits_for_plan();

-- Refresh all existing users with correct credits from shop
DO $$
BEGIN
  UPDATE user_credits uc
  SET balance = si.credits_amount
  FROM subscriptions s
  JOIN shop_items si ON si.name = s.plan AND si.item_type = 'subscription' AND si.is_active = true
  WHERE uc.user_id = s.user_id
  AND s.status = 'active';
  
  RAISE NOTICE 'All user credits refreshed from shop_items';
END $$;
