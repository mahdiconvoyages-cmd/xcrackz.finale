/*
  # Force Credit Update - Radical Fix

  1. Changes
    - Always SET credits to plan amount (don't add)
    - Force update on every subscription change
    - Immediate effect

  2. Logic
    - If plan changes → SET credits to plan amount
    - If new subscription → SET credits to plan amount
    - No addition, just replacement with correct amount
*/

-- Drop and recreate completely
DROP TRIGGER IF EXISTS assign_credits_on_subscription ON subscriptions;
DROP FUNCTION IF EXISTS assign_credits_for_plan();

-- New radical function
CREATE OR REPLACE FUNCTION assign_credits_for_plan()
RETURNS TRIGGER AS $$
DECLARE
  credit_amount INTEGER;
BEGIN
  -- Only if subscription is active
  IF NEW.status = 'active' THEN
    
    -- Map plan to credits
    CASE NEW.plan
      WHEN 'free' THEN credit_amount := 10;
      WHEN 'basic' THEN credit_amount := 50;
      WHEN 'pro' THEN credit_amount := 100;
      WHEN 'premium' THEN credit_amount := 250;
      WHEN 'enterprise' THEN credit_amount := 500;
      WHEN 'business' THEN credit_amount := 1000;
      ELSE credit_amount := 10;
    END CASE;

    -- FORCE update to exact amount
    INSERT INTO user_credits (user_id, balance)
    VALUES (NEW.user_id, credit_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = credit_amount;
    
    RAISE NOTICE 'Credits set to % for user % with plan %', credit_amount, NEW.user_id, NEW.plan;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on both INSERT and UPDATE
CREATE TRIGGER assign_credits_on_subscription
  AFTER INSERT OR UPDATE OF plan, status ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION assign_credits_for_plan();
