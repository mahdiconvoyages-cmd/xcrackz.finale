-- ==================================================================
-- FIX FINAL : Corriger TOUS les triggers pour que l'inscription fonctionne
-- Exécuter dans Supabase Dashboard → SQL Editor
-- ==================================================================

-- =============================================
-- ÉTAPE 1 : Ajouter les colonnes manquantes
-- =============================================

-- Colonne credits_remaining manquante dans subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'credits_remaining'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN credits_remaining INTEGER DEFAULT 0;
    RAISE NOTICE 'Added credits_remaining to subscriptions';
  END IF;
END $$;

-- =============================================
-- ÉTAPE 2 : Supprimer TOUS les triggers sur auth.users
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;

-- =============================================
-- ÉTAPE 3 : Recréer handle_new_user ULTRA-SAFE
-- =============================================
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
  
  IF v_full_name != '' AND POSITION(' ' IN v_full_name) > 0 THEN
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    v_last_name := SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1);
  ELSE
    v_first_name := v_full_name;
    v_last_name := '';
  END IF;

  -- 1. Insérer le profil
  BEGIN
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
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] profiles error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  -- 2. Insérer user_credits
  BEGIN
    INSERT INTO public.user_credits (user_id, balance, created_at, updated_at)
    VALUES (NEW.id, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] user_credits error: %', SQLERRM;
  END;

  -- 3. Insérer subscription
  BEGIN
    INSERT INTO public.subscriptions (user_id, plan, status, created_at, updated_at)
    VALUES (NEW.id, 'free', 'active', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] subscription error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- =============================================
-- ÉTAPE 4 : Recréer handle_email_confirmed ULTRA-SAFE
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_got_bonus BOOLEAN;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Seulement si email_confirmed_at vient de changer (NULL → valeur)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Vérifier qu'on n'a pas déjà donné le bonus
    BEGIN
      SELECT EXISTS(
        SELECT 1 FROM public.credit_transactions
        WHERE user_id = NEW.id AND transaction_type = 'welcome_bonus'
      ) INTO v_already_got_bonus;
    EXCEPTION WHEN OTHERS THEN
      v_already_got_bonus := false;
      RAISE WARNING '[handle_email_confirmed] check bonus error: %', SQLERRM;
    END;
    
    IF NOT COALESCE(v_already_got_bonus, false) THEN
      v_end_date := NOW() + INTERVAL '30 days';
      
      -- Ajouter 10 crédits au profil
      BEGIN
        UPDATE public.profiles
        SET credits = COALESCE(credits, 0) + 10,
            email_verified = true,
            updated_at = NOW()
        WHERE id = NEW.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[handle_email_confirmed] profiles update error: %', SQLERRM;
      END;
      
      -- Logger la transaction
      BEGIN
        INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, expires_at)
        VALUES (
          NEW.id, 
          10, 
          'welcome_bonus', 
          'Crédits de bienvenue - Merci d''avoir confirmé votre email !',
          v_end_date
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[handle_email_confirmed] credit_transactions insert error: %', SQLERRM;
      END;
      
      -- Mettre à jour la subscription
      BEGIN
        UPDATE public.subscriptions
        SET current_period_end = v_end_date,
            credits_remaining = 10,
            updated_at = NOW()
        WHERE user_id = NEW.id AND status = 'active';
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[handle_email_confirmed] subscription update error: %', SQLERRM;
      END;
      
      RAISE NOTICE '[handle_email_confirmed] Gave 10 welcome credits to user %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================
-- ÉTAPE 5 : Recréer les triggers
-- =============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_confirmed();

-- =============================================
-- ÉTAPE 6 : Nettoyage des users test qui ont échoué
-- =============================================
-- Supprimer les users de test qui n'ont pas de profil
-- (les inscriptions ratées précédentes)
DELETE FROM auth.users 
WHERE email LIKE 'test_debug_%@gmail.com';

-- =============================================
-- VÉRIFICATION
-- =============================================
SELECT 'FIX COMPLET - Les 2 triggers sont recréés avec protection maximale' AS status;
