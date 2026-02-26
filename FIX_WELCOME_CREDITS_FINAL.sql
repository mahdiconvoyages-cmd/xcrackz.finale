-- ==================================================================
-- FIX : Double crédits de bienvenue (20 au lieu de 10)
-- 
-- PROBLÈME : L'INSERT dans credit_transactions échoue car 
-- balance_after (NOT NULL) n'est pas fourni → le check welcome_bonus
-- ne trouve jamais de record → si le trigger fire 2 fois = 2×10 = 20
--
-- SOLUTION : Inclure balance_after dans l'INSERT
-- Exécuter dans Supabase Dashboard → SQL Editor
-- ==================================================================

-- Recréer handle_email_confirmed avec balance_after
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_got_bonus BOOLEAN;
  v_end_date TIMESTAMPTZ;
  v_new_balance INTEGER;
BEGIN
  -- Seulement si email_confirmed_at vient de changer (NULL → valeur)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Vérifier qu'on n'a pas déjà donné le bonus
    BEGIN
      SELECT EXISTS(
        SELECT 1 FROM public.credit_transactions
        WHERE user_id = NEW.id AND description LIKE 'welcome_bonus%'
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
        WHERE id = NEW.id
        RETURNING credits INTO v_new_balance;
      EXCEPTION WHEN OTHERS THEN
        v_new_balance := 10;
        RAISE WARNING '[handle_email_confirmed] profiles update error: %', SQLERRM;
      END;
      
      -- Logger la transaction AVEC balance_after (colonne NOT NULL !)
      -- NOTE: transaction_type CHECK constraint only allows 'addition' / 'deduction'
      -- On utilise 'addition' et on met 'welcome_bonus' dans la description
      BEGIN
        INSERT INTO public.credit_transactions (
          user_id, amount, transaction_type, description, 
          balance_after, expires_at
        )
        VALUES (
          NEW.id, 
          10, 
          'addition', 
          'welcome_bonus - Crédits de bienvenue - Merci d''avoir confirmé votre email !',
          COALESCE(v_new_balance, 10),
          v_end_date
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[handle_email_confirmed] credit_transactions insert error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
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

-- Vérifier que le trigger existe bien
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_email_confirmed' 
    AND tgrelid = (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth'))
  ) THEN
    CREATE TRIGGER on_email_confirmed
      AFTER UPDATE OF email_confirmed_at ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_email_confirmed();
    RAISE NOTICE 'Trigger on_email_confirmed créé';
  ELSE
    RAISE NOTICE 'Trigger on_email_confirmed existe déjà';
  END IF;
END $$;

-- ==================================================================
-- Corriger le compte mahdi199409@gmail.com (20 → 10 crédits)
-- ==================================================================
UPDATE public.profiles 
SET credits = 10, updated_at = NOW()
WHERE email = 'mahdi199409@gmail.com';

-- user_credits sera synchronisé automatiquement via sync_credits_bidirectional

-- Ajouter la transaction manquante pour ce compte
INSERT INTO public.credit_transactions (
  user_id, amount, transaction_type, description, balance_after, expires_at
)
SELECT 
  id, 10, 'addition', 
  'welcome_bonus - Crédits de bienvenue - Merci d''avoir confirmé votre email !',
  10,
  NOW() + INTERVAL '30 days'
FROM public.profiles 
WHERE email = 'mahdi199409@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.credit_transactions ct 
  WHERE ct.user_id = profiles.id AND ct.description LIKE 'welcome_bonus%'
);

SELECT 'FIX APPLIQUÉ - Les prochaines inscriptions donneront exactement 10 crédits' AS status;
