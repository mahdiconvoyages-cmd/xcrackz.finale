-- ============================================================
-- FIX: Subscription plan CHECK constraint + auto_renew column
-- Problem: 'essentiel' plan used in app but NOT in DB constraint
-- This causes silent INSERT/UPDATE failures when granting subscriptions
-- ============================================================

-- 1) Drop the old CHECK constraint on plan column
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- 2) Add the new CHECK constraint including 'essentiel'
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check 
  CHECK (plan IN ('free', 'starter', 'essentiel', 'basic', 'pro', 'business', 'enterprise'));

-- 3) Add auto_renew column if it doesn't exist
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true;

-- 4) Migrate any old 'basic' plans to 'essentiel' (basic was the old name)
UPDATE public.subscriptions SET plan = 'essentiel' WHERE plan = 'basic';

-- 5) Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions' AND table_schema = 'public'
ORDER BY ordinal_position;
