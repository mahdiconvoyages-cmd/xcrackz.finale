-- ============================================
-- FIX: Fonction link_referral SECURITY DEFINER
-- Pour contourner les RLS lors de l'inscription
-- ============================================

-- Cette fonction est appelée depuis l'app mobile après signup
-- Elle lie le filleul à son parrain de manière sécurisée
CREATE OR REPLACE FUNCTION public.link_referral(
  p_referrer_id UUID,
  p_referred_id UUID,
  p_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypass RLS pour pouvoir insérer dans referrals
SET search_path = public
AS $$
BEGIN
  -- 1. Mettre à jour referred_by sur le profil du filleul
  UPDATE profiles 
  SET referred_by = p_referrer_id
  WHERE id = p_referred_id
    AND referred_by IS NULL;  -- Ne pas écraser si déjà set

  -- 2. Insérer dans la table referrals (si pas déjà existant)
  INSERT INTO referrals (referrer_id, referred_id, referral_code, status, created_at)
  VALUES (p_referrer_id, p_referred_id, UPPER(TRIM(p_code)), 'pending', NOW())
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Referral linked: % -> % with code %', p_referrer_id, p_referred_id, p_code;
END;
$$;

-- Donner accès à la fonction aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.link_referral(UUID, UUID, TEXT) TO authenticated;

-- ============================================
-- VÉRIFICATION: Tester la fonction
-- ============================================
-- SELECT link_referral('uuid-parrain', 'uuid-filleul', 'REF-XXXX');
