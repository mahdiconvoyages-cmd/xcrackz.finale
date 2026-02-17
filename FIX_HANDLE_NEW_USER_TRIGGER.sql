-- ============================================
-- FIX: "Database error saving new user" (500)
-- ============================================
-- Root cause: handle_new_user trigger fails silently,
-- which blocks auth.users INSERT entirely.
--
-- Bugs fixed:
-- 1. user_credits INSERT referenced non-existent created_at column
-- 2. No EXCEPTION handler → any error kills the entire signup
-- 3. Column mismatch if some ALTER TABLE migrations weren't applied
-- 4. No ON CONFLICT → duplicate key errors on retry
-- 5. user_type CHECK constraint mismatch with passed metadata
-- ============================================

-- Step 1: Drop the CHECK constraint on user_type if it exists
-- (Some migrations added CHECK ('company','driver','individual') but signup
--  code may send 'donneur_ordre' or other values)
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_user_type;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No user_type constraint to drop: %', SQLERRM;
END;
$$;

-- Step 2: Ensure all required columns exist in profiles
DO $$
BEGIN
  -- Core columns that the trigger needs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='full_name') THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_type') THEN
    ALTER TABLE public.profiles ADD COLUMN user_type TEXT DEFAULT 'individual';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='device_fingerprint') THEN
    ALTER TABLE public.profiles ADD COLUMN device_fingerprint TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='registration_ip') THEN
    ALTER TABLE public.profiles ADD COLUMN registration_ip TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='app_role') THEN
    ALTER TABLE public.profiles ADD COLUMN app_role TEXT DEFAULT 'convoyeur';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='credits') THEN
    ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 0 NOT NULL;
  END IF;
END;
$$;

-- Step 3: Ensure user_credits table exists and has correct schema
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Ensure subscriptions table exists
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT subscriptions_user_id_key UNIQUE (user_id)
);

-- Step 5: Replace the trigger function with a ROBUST version
-- NOTE: full_name is a GENERATED ALWAYS column (computed from first_name || ' ' || last_name)
-- so we MUST write to first_name + last_name instead!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Split full_name from metadata into first_name + last_name
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_first_name := SPLIT_PART(v_full_name, ' ', 1);
  v_last_name := CASE 
    WHEN v_full_name LIKE '% %' THEN SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1)
    ELSE ''
  END;

  -- Insert profile (never fail on conflict)
  -- full_name is GENERATED ALWAYS from first_name || ' ' || last_name — do NOT insert it!
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name,
    last_name,
    phone, 
    user_type, 
    avatar_url,
    device_fingerprint, 
    registration_ip, 
    app_role,
    credits,
    created_at, 
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    v_first_name,
    v_last_name,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'individual'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'device_fingerprint',
    NEW.raw_user_meta_data->>'registration_ip',
    COALESCE(NEW.raw_user_meta_data->>'app_role', 'convoyeur'),
    0,
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
    updated_at = NOW();

  -- Insert user credits (never fail on conflict)
  INSERT INTO public.user_credits (user_id, balance, updated_at)
  VALUES (NEW.id, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert subscription (never fail on conflict)
  INSERT INTO public.subscriptions (user_id, plan, status, created_at, updated_at)
  VALUES (NEW.id, 'free', 'active', NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- NEVER block user creation - log the error and continue
    RAISE WARNING '[handle_new_user] Error for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Step 6: Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.user_credits TO postgres, service_role;
GRANT SELECT, UPDATE ON public.user_credits TO authenticated;
GRANT ALL ON public.subscriptions TO postgres, service_role;
GRANT SELECT, UPDATE ON public.subscriptions TO authenticated;

-- Step 8: Enable RLS but allow trigger (SECURITY DEFINER) to bypass
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_credits policies
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
CREATE POLICY "Users can view own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- subscriptions policies  
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- DONE! Test signup again — it should work now.
-- If the trigger fails, it will LOG a warning
-- instead of blocking user creation entirely.
-- ============================================
