/*
  # Add Manual Credit Refresh Function

  1. New Function
    - refresh_user_credits() - Force recalculate credits for all active subscriptions
    - Can be called manually or scheduled

  2. Usage
    - Call when credits seem wrong
    - Can be triggered from admin panel
    - Fixes any discrepancies
*/

-- Function to manually refresh all user credits
CREATE OR REPLACE FUNCTION refresh_all_user_credits()
RETURNS TABLE(user_id uuid, plan text, old_balance integer, new_balance integer) AS $$
BEGIN
  RETURN QUERY
  WITH credit_map AS (
    SELECT 
      s.user_id,
      s.plan,
      CASE s.plan
        WHEN 'free' THEN 10
        WHEN 'basic' THEN 50
        WHEN 'pro' THEN 100
        WHEN 'premium' THEN 250
        WHEN 'enterprise' THEN 500
        WHEN 'business' THEN 1000
        ELSE 10
      END as correct_credits
    FROM subscriptions s
    WHERE s.status = 'active'
  )
  UPDATE user_credits uc
  SET balance = cm.correct_credits
  FROM credit_map cm
  WHERE uc.user_id = cm.user_id
  RETURNING uc.user_id, cm.plan, 
    (SELECT balance FROM user_credits WHERE user_credits.user_id = uc.user_id) as old_balance,
    cm.correct_credits as new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute it now to fix all current users
DO $$
BEGIN
  -- Update all active subscriptions with correct credits
  UPDATE user_credits uc
  SET balance = CASE s.plan
    WHEN 'free' THEN 10
    WHEN 'basic' THEN 50
    WHEN 'pro' THEN 100
    WHEN 'premium' THEN 250
    WHEN 'enterprise' THEN 500
    WHEN 'business' THEN 1000
    ELSE 10
  END
  FROM subscriptions s
  WHERE s.user_id = uc.user_id
  AND s.status = 'active';
  
  RAISE NOTICE 'Credits refreshed for all active users';
END $$;
