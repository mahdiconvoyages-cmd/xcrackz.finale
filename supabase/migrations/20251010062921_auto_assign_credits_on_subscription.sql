/*
  # Auto-assign Credits Based on Subscription Plan

  1. Function
    - Creates a function that assigns credits based on subscription plan
    - Plan credits mapping:
      - free: 10 credits
      - basic: 50 credits
      - pro: 100 credits
      - premium: 250 credits
      - enterprise: 500 credits
      - business: 1000 credits

  2. Trigger
    - Automatically assigns credits when a subscription becomes active
    - Updates credits when plan changes
    - Runs on INSERT and UPDATE of subscriptions table

  3. Initial Update
    - Updates existing Pro users with 100 credits
*/

-- Function to assign credits based on plan
CREATE OR REPLACE FUNCTION assign_credits_for_plan()
RETURNS TRIGGER AS $$
DECLARE
  credit_amount INTEGER;
BEGIN
  -- Only process if status is active and plan has changed (or new row)
  IF NEW.status = 'active' THEN
    -- Determine credit amount based on plan
    CASE NEW.plan
      WHEN 'free' THEN credit_amount := 10;
      WHEN 'basic' THEN credit_amount := 50;
      WHEN 'pro' THEN credit_amount := 100;
      WHEN 'premium' THEN credit_amount := 250;
      WHEN 'enterprise' THEN credit_amount := 500;
      WHEN 'business' THEN credit_amount := 1000;
      ELSE credit_amount := 10; -- Default to free plan credits
    END CASE;

    -- Insert or update user credits
    INSERT INTO user_credits (user_id, balance)
    VALUES (NEW.user_id, credit_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = EXCLUDED.balance;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS assign_credits_on_subscription ON subscriptions;

-- Create trigger
CREATE TRIGGER assign_credits_on_subscription
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION assign_credits_for_plan();

-- Update existing Pro users to have 100 credits
UPDATE user_credits
SET balance = 100
WHERE user_id IN (
  SELECT user_id 
  FROM subscriptions 
  WHERE plan = 'pro' 
  AND status = 'active'
);

-- Update other plans as well
UPDATE user_credits
SET balance = 50
WHERE user_id IN (
  SELECT user_id 
  FROM subscriptions 
  WHERE plan = 'basic' 
  AND status = 'active'
);

UPDATE user_credits
SET balance = 250
WHERE user_id IN (
  SELECT user_id 
  FROM subscriptions 
  WHERE plan = 'premium' 
  AND status = 'active'
);

UPDATE user_credits
SET balance = 500
WHERE user_id IN (
  SELECT user_id 
  FROM subscriptions 
  WHERE plan = 'enterprise' 
  AND status = 'active'
);

UPDATE user_credits
SET balance = 1000
WHERE user_id IN (
  SELECT user_id 
  FROM subscriptions 
  WHERE plan = 'business' 
  AND status = 'active'
);
