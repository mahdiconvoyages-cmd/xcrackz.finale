-- ==================================================================
-- FIX DÉFINITIF : Double crédits de bienvenue (20 au lieu de 10)
-- ==================================================================
-- 
-- ANALYSE du problème :
-- 
-- Quand handle_email_confirmed() fire, il fait :
--   UPDATE profiles SET credits = credits + 10
-- 
-- Cela déclenche une CHAÎNE de triggers :
--
-- TRIGGERS SUR profiles (quand credits change) :
--   1. sync_profile_credits_to_user_credits → sync_credits_bidirectional()
--      → UPDATE user_credits SET balance = NEW.credits
--
-- TRIGGERS SUR user_credits (quand balance change) :
--   2. sync_user_credits_to_profile → sync_credits_bidirectional()  
--      → UPDATE profiles SET credits = NEW.balance
--      (a une condition WHEN old.balance IS DISTINCT FROM new.balance)
--
--   3. trigger_sync_profile_credits → sync_profile_credits_from_user_credits()
--      → UPDATE profiles SET credits = NEW.balance
--      ⚠️ PAS DE CONDITION WHEN ! Fire même sur INSERT !
--
-- RÉSULTAT : Quand handle_email_confirmed met credits=10 :
-- - Trigger 1 : user_credits.balance → 10
-- - Trigger 2 : profiles.credits → 10 (redondant mais ok, DISTINCT arrête la boucle)
-- - Trigger 3 : profiles.credits → 10 ENCORE (pas de WHEN → re-fire toujours)
--   → Re-trigger 1 → user_credits.balance → 10 (DISTINCT, pas de changement... MAIS)
--   ⚠️ Le INSERT initial de handle_new_user crée user_credits(balance=0)
--   → trigger_sync_profile_credits fire sur INSERT → profiles.credits = 0
--   → Puis handle_email_confirmed fire → profiles.credits = 0 + 10 = 10
--   → sync → user_credits = 10 → trigger_sync_profile_credits → profiles = 10
--   → sync_credits_bidirectional profiles→user_credits → balance=10 
--   → MAIS trigger_sync_profile_credits sans WHEN re-fire et fait ENCORE un 
--     UPDATE profiles SET credits = 10, ce qui re-déclenche sync_profile_credits_to_user_credits
--
-- La boucle s'arrête grâce aux conditions WHEN DISTINCT...
-- MAIS le vrai problème est que handle_email_confirmed fait credits += 10 (incrémental)
-- et les syncs font credits = balance (absolu). Si le timing fait que le UPDATE
-- profiles arrive AVANT que la transaction du premier +10 ne soit committed,
-- on peut avoir un double increment.
--
-- ⚡ SOLUTION SIMPLE : Supprimer le trigger DOUBLON trigger_sync_profile_credits
-- (il fait la même chose que sync_user_credits_to_profile mais sans WHEN condition)
-- 
-- ET : Réécrire handle_email_confirmed pour être VRAIMENT atomique
-- ==================================================================

-- =============================================
-- ÉTAPE 1 : Supprimer le trigger DOUBLON sur user_credits
-- =============================================
-- trigger_sync_profile_credits est un doublon de sync_user_credits_to_profile
-- MAIS sans la protection WHEN (old.balance IS DISTINCT FROM new.balance)
DROP TRIGGER IF EXISTS trigger_sync_profile_credits ON public.user_credits;

-- On peut aussi supprimer la fonction orpheline
DROP FUNCTION IF EXISTS public.sync_profile_credits_from_user_credits() CASCADE;

-- =============================================
-- ÉTAPE 2 : Recréer handle_email_confirmed ATOMIQUE
-- =============================================
-- Utilise un advisory lock pour empêcher tout double fire
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_got_bonus BOOLEAN := false;
  v_end_date TIMESTAMPTZ;
  v_new_balance INTEGER;
  v_lock_key BIGINT;
BEGIN
  -- Seulement si email_confirmed_at vient de changer (NULL → valeur)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Advisory lock basé sur le user_id pour empêcher le double fire
    v_lock_key := ('x' || LEFT(REPLACE(NEW.id::text, '-', ''), 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
    -- Vérifier qu'on n'a pas déjà donné le bonus (avec FOR UPDATE pour lock la row)
    BEGIN
      SELECT EXISTS(
        SELECT 1 FROM public.credit_transactions
        WHERE user_id = NEW.id AND description LIKE 'welcome_bonus%'
        FOR UPDATE
      ) INTO v_already_got_bonus;
    EXCEPTION WHEN OTHERS THEN
      v_already_got_bonus := false;
      RAISE WARNING '[handle_email_confirmed] check bonus error: %', SQLERRM;
    END;
    
    IF NOT v_already_got_bonus THEN
      v_end_date := NOW() + INTERVAL '30 days';
      
      -- D'abord insérer la transaction (verrou anti-doublon)
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
          10,
          v_end_date
        );
      EXCEPTION WHEN OTHERS THEN
        -- Si l'insert échoue (doublon ou autre), on arrête tout
        RAISE WARNING '[handle_email_confirmed] credit_transactions insert error: % — STOP', SQLERRM;
        RETURN NEW;
      END;
      
      -- Ensuite mettre à jour le profil
      BEGIN
        UPDATE public.profiles
        SET credits = COALESCE(credits, 0) + 10,
            email_verified = true,
            updated_at = NOW()
        WHERE id = NEW.id
        RETURNING credits INTO v_new_balance;
        
        -- Corriger balance_after avec la vraie valeur
        UPDATE public.credit_transactions
        SET balance_after = COALESCE(v_new_balance, 10)
        WHERE user_id = NEW.id AND description LIKE 'welcome_bonus%';
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[handle_email_confirmed] profiles update error: %', SQLERRM;
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
    ELSE
      RAISE NOTICE '[handle_email_confirmed] User % already has welcome_bonus — skipping', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================
-- ÉTAPE 3 : Corriger le compte actuel (20 → 10)
-- =============================================
UPDATE public.profiles 
SET credits = 10, updated_at = NOW()
WHERE email = 'mahdi199409@gmail.com';

-- S'assurer que user_credits est synchronisé
UPDATE public.user_credits 
SET balance = 10, updated_at = NOW()
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'mahdi199409@gmail.com');

-- S'assurer que la transaction welcome_bonus existe
INSERT INTO public.credit_transactions (
  user_id, amount, transaction_type, description, balance_after, expires_at
)
SELECT 
  id, 10, 'addition', 
  'welcome_bonus - Crédits de bienvenue',
  10,
  NOW() + INTERVAL '30 days'
FROM public.profiles 
WHERE email = 'mahdi199409@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.credit_transactions ct 
  WHERE ct.user_id = profiles.id AND ct.description LIKE 'welcome_bonus%'
);

-- =============================================
-- VÉRIFICATION
-- =============================================
SELECT 'TRIGGERS SUR profiles:' AS info;
SELECT tgname, pg_get_triggerdef(t.oid) 
FROM pg_trigger t 
JOIN pg_class c ON t.tgrelid = c.oid 
WHERE c.relname = 'profiles' AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND NOT t.tgisinternal;

SELECT 'TRIGGERS SUR user_credits:' AS info;
SELECT tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'user_credits' AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND NOT t.tgisinternal;

SELECT 'FIX DÉFINITIF APPLIQUÉ' AS status,
       'trigger_sync_profile_credits SUPPRIMÉ (doublon sans WHEN)' AS action1,
       'handle_email_confirmed avec advisory lock + INSERT-first' AS action2;
