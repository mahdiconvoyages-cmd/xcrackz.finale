-- ============================================================================
-- SYSTÈME DE PARRAINAGE (REFERRAL SYSTEM)
-- ============================================================================
-- Chaque utilisateur a un code parrainage unique.
-- Quand un filleul s'inscrit avec ce code, il est lié au parrain.
-- Quand l'admin attribue un abonnement au filleul → le parrain gagne 10 crédits.
-- ============================================================================

-- 1. Ajouter les colonnes de parrainage sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- 2. Table de suivi des parrainages
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'expired')),
  reward_credits INTEGER DEFAULT 0,
  rewarded_at TIMESTAMPTZ,
  subscription_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- 3. Index pour performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- 4. Générer un code parrainage unique pour un utilisateur
CREATE OR REPLACE FUNCTION generate_referral_code(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  prefix TEXT;
  user_name TEXT;
  attempts INT := 0;
BEGIN
  -- Récupérer le nom pour le préfixe
  SELECT COALESCE(
    UPPER(LEFT(REGEXP_REPLACE(full_name, '[^a-zA-Z]', '', 'g'), 3)),
    UPPER(LEFT(REGEXP_REPLACE(email, '[^a-zA-Z]', '', 'g'), 3))
  ) INTO prefix FROM public.profiles WHERE id = user_id;
  
  IF prefix IS NULL OR LENGTH(prefix) < 2 THEN
    prefix := 'REF';
  END IF;
  
  -- Générer un code unique
  LOOP
    code := prefix || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4));
    -- Vérifier unicité
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code) THEN
      RETURN code;
    END IF;
    attempts := attempts + 1;
    IF attempts > 20 THEN
      -- Fallback avec plus de caractères
      code := prefix || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- 5. Générer les codes pour tous les utilisateurs existants qui n'en ont pas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL
  LOOP
    UPDATE public.profiles
    SET referral_code = generate_referral_code(r.id)
    WHERE id = r.id;
  END LOOP;
  RAISE NOTICE 'Codes de parrainage générés pour tous les utilisateurs existants';
END;
$$;

-- 6. Trigger: Générer automatiquement le code parrainage à la création du profil
CREATE OR REPLACE FUNCTION assign_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_referral_code ON public.profiles;
CREATE TRIGGER trg_assign_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_referral_code();

-- 7. Trigger: Quand un abonnement actif est attribué → récompenser le parrain
CREATE OR REPLACE FUNCTION reward_referrer_on_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_code TEXT;
  v_already_rewarded BOOLEAN;
  v_current_credits INT;
  v_new_credits INT;
  v_reward_amount INT := 10;
BEGIN
  -- Seulement sur insertion OU sur update vers 'active'
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active') THEN
    -- Vérifier si le filleul a un parrain
    SELECT referred_by INTO v_referrer_id
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    IF v_referrer_id IS NULL THEN
      RETURN NEW; -- Pas de parrain, rien à faire
    END IF;
    
    -- Vérifier si ce parrainage a déjà été récompensé
    SELECT EXISTS(
      SELECT 1 FROM public.referrals
      WHERE referrer_id = v_referrer_id
        AND referred_id = NEW.user_id
        AND status = 'rewarded'
    ) INTO v_already_rewarded;
    
    IF v_already_rewarded THEN
      RETURN NEW; -- Déjà récompensé pour ce filleul
    END IF;
    
    -- Récupérer le code parrainage utilisé
    SELECT referral_code INTO v_referral_code
    FROM public.profiles
    WHERE id = v_referrer_id;
    
    -- Récompenser le parrain : +10 crédits
    SELECT COALESCE(credits, 0) INTO v_current_credits
    FROM public.profiles
    WHERE id = v_referrer_id;
    
    v_new_credits := v_current_credits + v_reward_amount;
    
    UPDATE public.profiles
    SET credits = v_new_credits,
        updated_at = NOW()
    WHERE id = v_referrer_id;
    
    -- Enregistrer la transaction de crédits
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, balance_after)
    VALUES (
      v_referrer_id,
      v_reward_amount,
      'referral_reward',
      'Récompense parrainage — filleul ' || (SELECT COALESCE(full_name, email) FROM public.profiles WHERE id = NEW.user_id),
      v_new_credits
    );
    
    -- Mettre à jour ou créer l'entrée dans referrals
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status, reward_credits, rewarded_at, subscription_id)
    VALUES (v_referrer_id, NEW.user_id, COALESCE(v_referral_code, ''), 'rewarded', v_reward_amount, NOW(), NEW.id)
    ON CONFLICT (referrer_id, referred_id)
    DO UPDATE SET
      status = 'rewarded',
      reward_credits = v_reward_amount,
      rewarded_at = NOW(),
      subscription_id = NEW.id;
    
    RAISE NOTICE 'Parrainage récompensé: % reçoit % crédits pour le filleul %', v_referrer_id, v_reward_amount, NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reward_referrer ON public.subscriptions;
CREATE TRIGGER trg_reward_referrer
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION reward_referrer_on_subscription();

-- 8. RLS Policies
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "Admin full access referrals" ON public.referrals;
CREATE POLICY "Admin full access referrals" ON public.referrals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Permettre la lecture du referral_code dans profiles (déjà accessible via les policies existantes)
-- Permettre la mise à jour de referred_by lors de l'inscription
DROP POLICY IF EXISTS "Users can update own referred_by" ON public.profiles;
CREATE POLICY "Users can update own referred_by" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 9. Fonction utilitaire: Valider un code parrainage
CREATE OR REPLACE FUNCTION validate_referral_code(p_code TEXT)
RETURNS TABLE(valid BOOLEAN, referrer_id UUID, referrer_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE,
    p.id,
    COALESCE(p.full_name, p.email)
  FROM public.profiles p
  WHERE p.referral_code = UPPER(TRIM(p_code))
    AND p.banned IS NOT TRUE;
  
  -- Si aucun résultat, retourner false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT;
  END IF;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION validate_referral_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_referral_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_referral_code(UUID) TO authenticated;

GRANT ALL ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
