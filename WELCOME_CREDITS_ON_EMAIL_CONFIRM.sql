-- ==================================================================
-- NOUVEAU FLUX INSCRIPTION :
-- 1. Inscription → 0 crédits, connexion directe (pas de confirm email obligatoire)
-- 2. L'user confirme son email → reçoit 10 crédits de bienvenue (expirent dans 30j)
-- ==================================================================

-- =============================================
-- ÉTAPE 1 : Mettre les crédits à 0 pour le user actuel (reset)
-- =============================================
UPDATE public.profiles
SET credits = 0, updated_at = NOW()
WHERE credits > 0 AND id IN (
  SELECT id FROM auth.users WHERE email_confirmed_at IS NULL
);

-- =============================================
-- ÉTAPE 2 : Table credit_transactions pour tracer les crédits
-- =============================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'welcome_bonus', 'purchase', 'usage', 'expiry', 'refund'
  description TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);

-- RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can manage all" ON public.credit_transactions;
CREATE POLICY "Service role can manage all" ON public.credit_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- ÉTAPE 3 : Trigger qui donne 10 crédits quand l'email est confirmé
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
    SELECT EXISTS(
      SELECT 1 FROM public.credit_transactions
      WHERE user_id = NEW.id AND type = 'welcome_bonus'
    ) INTO v_already_got_bonus;
    
    IF NOT v_already_got_bonus THEN
      -- Date d'expiration : 30 jours à partir de maintenant
      v_end_date := NOW() + INTERVAL '30 days';
      
      -- Ajouter 10 crédits au profil
      UPDATE public.profiles
      SET credits = COALESCE(credits, 0) + 10,
          email_verified = true,
          updated_at = NOW()
      WHERE id = NEW.id;
      
      -- Logger la transaction
      INSERT INTO public.credit_transactions (user_id, amount, type, description, expires_at)
      VALUES (
        NEW.id, 
        10, 
        'welcome_bonus', 
        '🎁 Crédits de bienvenue — Merci d''avoir confirmé votre email !',
        v_end_date
      );
      
      -- Mettre à jour la subscription avec la date de fin (30j)
      UPDATE public.subscriptions
      SET current_period_end = v_end_date,
          credits_remaining = 10,
          updated_at = NOW()
      WHERE user_id = NEW.id AND status = 'active';
      
      RAISE NOTICE '[handle_email_confirmed] Gave 10 welcome credits to user %, expires %', NEW.id, v_end_date;
    END IF;
  END IF;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[handle_email_confirmed] Error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- =============================================
-- ÉTAPE 4 : Créer le trigger sur auth.users UPDATE
-- =============================================
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_confirmed();

-- =============================================
-- ÉTAPE 5 : Vérification
-- =============================================
SELECT 'Trigger on_email_confirmed créé avec succès — 10 crédits de bienvenue à la confirmation email' AS status;
