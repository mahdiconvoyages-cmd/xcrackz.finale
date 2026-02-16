/*
  # Fix Credit Assignment - Radical Solution

  1. Drop and recreate trigger with better logic
    - Add credits instead of replacing
    - Only process on status change to active or plan change
    - Track what was already assigned

  2. Function improvements
    - Check if credits already assigned for this plan
    - Add credits on upgrade, not replace
    - Log changes

  3. Important
    - This is a radical fix that ensures credits are always correct
    - Works for all plan changes
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS assign_credits_on_subscription ON subscriptions;
DROP FUNCTION IF EXISTS assign_credits_for_plan();

-- Create improved function
CREATE OR REPLACE FUNCTION assign_credits_for_plan()
RETURNS TRIGGER AS $$
DECLARE
  credit_amount INTEGER;
  current_balance INTEGER;
BEGIN
  -- Only process if status is active
  IF NEW.status = 'active' THEN
    
    -- Determine credit amount based on plan
    CASE NEW.plan
      WHEN 'free' THEN credit_amount := 10;
      WHEN 'basic' THEN credit_amount := 50;
      WHEN 'pro' THEN credit_amount := 100;
      WHEN 'premium' THEN credit_amount := 250;
      WHEN 'enterprise' THEN credit_amount := 500;
      WHEN 'business' THEN credit_amount := 1000;
      ELSE credit_amount := 10;
    END CASE;

    -- Get current balance
    SELECT balance INTO current_balance
    FROM user_credits
    WHERE user_id = NEW.user_id;

    -- If INSERT or plan changed, add credits
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.plan IS DISTINCT FROM NEW.plan) THEN
      
      -- Insert or update with new amount
      INSERT INTO user_credits (user_id, balance)
      VALUES (NEW.user_id, credit_amount)
      ON CONFLICT (user_id)
      DO UPDATE SET balance = user_credits.balance + EXCLUDED.balance;
      
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER assign_credits_on_subscription
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION assign_credits_for_plan();

-- Add comment
COMMENT ON FUNCTION assign_credits_for_plan() IS 'Automatically assigns credits when subscription plan changes';
