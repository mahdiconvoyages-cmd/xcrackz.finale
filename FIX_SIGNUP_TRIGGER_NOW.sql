-- =============================================================
-- FIX URGENT: Trigger handle_new_user qui cause 500 au signup
-- Exécuter dans Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. Supprimer les vues qui dépendent de full_name
DROP VIEW IF EXISTS public.contact_invitations_received CASCADE;
DROP VIEW IF EXISTS public.contact_invitations_sent CASCADE;

-- 2. Convertir full_name GENERATED → colonne normale
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'full_name' 
    AND generation_expression IS NOT NULL
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN full_name;
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    UPDATE public.profiles 
    SET full_name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    WHERE full_name IS NULL;
    RAISE NOTICE 'full_name converted from GENERATED to normal column';
  ELSE
    RAISE NOTICE 'full_name is already a normal column';
  END IF;
END $$;

-- 3. Recréer les vues contact_invitations_received et contact_invitations_sent
CREATE OR REPLACE VIEW public.contact_invitations_received AS
 SELECT c.id,
    c.user_id,
    c.name,
    c.company,
    c.email,
    c.phone,
    c.address,
    c.notes,
    c.category,
    c.is_favorite,
    c.created_at,
    c.updated_at,
    c.has_calendar_access,
    c.role,
    c.is_active,
    c.is_driver,
    c.driver_licenses,
    c.current_latitude,
    c.current_longitude,
    c.availability_status,
    c.preferred_zones,
    c.rating_average,
    c.missions_completed,
    c.last_location_update,
    c.invitation_status,
    c.invited_by,
    c.invited_user_id,
    c.invitation_sent_at,
    c.invitation_responded_at,
    p.full_name AS inviter_name,
    p.email AS inviter_email,
    p.phone AS inviter_phone
   FROM public.contacts c
     LEFT JOIN public.profiles p ON c.invited_by = p.id
  WHERE c.invitation_status = 'pending';

GRANT ALL ON public.contact_invitations_received TO anon;
GRANT ALL ON public.contact_invitations_received TO authenticated;
GRANT ALL ON public.contact_invitations_received TO service_role;

CREATE OR REPLACE VIEW public.contact_invitations_sent AS
 SELECT c.id,
    c.user_id,
    c.name,
    c.company,
    c.email,
    c.phone,
    c.address,
    c.notes,
    c.category,
    c.is_favorite,
    c.created_at,
    c.updated_at,
    c.has_calendar_access,
    c.role,
    c.is_active,
    c.is_driver,
    c.driver_licenses,
    c.current_latitude,
    c.current_longitude,
    c.availability_status,
    c.preferred_zones,
    c.rating_average,
    c.missions_completed,
    c.last_location_update,
    c.invitation_status,
    c.invited_by,
    c.invited_user_id,
    c.invitation_sent_at,
    c.invitation_responded_at,
    p.full_name AS invited_name,
    p.email AS invited_email,
    p.phone AS invited_phone
   FROM public.contacts c
     LEFT JOIN public.profiles p ON c.invited_user_id = p.id
  WHERE c.invitation_status = 'pending';

GRANT ALL ON public.contact_invitations_sent TO anon;
GRANT ALL ON public.contact_invitations_sent TO authenticated;
GRANT ALL ON public.contact_invitations_sent TO service_role;

-- 2. S'assurer que les tables nécessaires existent
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  credits_remaining INTEGER DEFAULT 0,
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Recréer le trigger ULTRA-SAFE
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
  -- Extraire le nom depuis les métadonnées
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  
  -- Séparer prénom/nom
  IF v_full_name != '' AND POSITION(' ' IN v_full_name) > 0 THEN
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    v_last_name := SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1);
  ELSE
    v_first_name := v_full_name;
    v_last_name := '';
  END IF;

  -- Insérer le profil (ON CONFLICT = jamais échouer)
  INSERT INTO public.profiles (
    id, email, full_name, first_name, last_name,
    phone, user_type, avatar_url,
    device_fingerprint, registration_ip, app_role,
    credits, created_at, updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    NULLIF(v_full_name, ''),
    NULLIF(v_first_name, ''),
    NULLIF(v_last_name, ''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', ''), ''),
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
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
    user_type = COALESCE(NULLIF(EXCLUDED.user_type, 'individual'), profiles.user_type),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    app_role = COALESCE(NULLIF(EXCLUDED.app_role, ''), profiles.app_role),
    updated_at = NOW();

  -- Insérer user_credits (jamais échouer)
  BEGIN
    INSERT INTO public.user_credits (user_id, balance, created_at, updated_at)
    VALUES (NEW.id, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] user_credits error: %', SQLERRM;
  END;

  -- Insérer subscription (jamais échouer)
  BEGIN
    INSERT INTO public.subscriptions (user_id, plan, status, created_at, updated_at)
    VALUES (NEW.id, 'free', 'active', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] subscription error: %', SQLERRM;
  END;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- JAMAIS bloquer la création du compte
    RAISE WARNING '[handle_new_user] CRITICAL error for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- 4. Recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Vérifier
SELECT 'Trigger handle_new_user recréé avec succès' AS status;
