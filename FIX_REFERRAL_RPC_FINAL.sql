-- ============================================================================
-- FONCTION SÉCURISÉE POUR RÉCOMPENSE PARRAINAGE
-- ============================================================================
-- Bypass RLS pour donner +10 crédits au parrain ET au filleul
-- Appelée depuis AdminUsers.tsx via supabase.rpc('grant_referral_reward', ...)
-- ============================================================================

-- Supprimer le trigger cassé qui utilise user_notifications (table inexistante)
DROP TRIGGER IF EXISTS trg_reward_referrer ON public.subscriptions;
DROP FUNCTION IF EXISTS reward_referrer_on_subscription();

-- Créer la fonction principale
CREATE OR REPLACE FUNCTION grant_referral_reward(
  p_filleul_id UUID,
  p_reward_amount INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_code TEXT;
  v_referrer_name TEXT;
  v_filleul_name TEXT;
  v_referrer_credits INT;
  v_referrer_new_credits INT;
  v_filleul_credits INT;
  v_filleul_new_credits INT;
  v_already_rewarded BOOLEAN;
BEGIN
  -- 1. Vérifier si le filleul a un parrain
  SELECT referred_by INTO v_referrer_id
  FROM profiles WHERE id = p_filleul_id;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_referrer');
  END IF;

  -- 2. Vérifier si déjà récompensé
  SELECT EXISTS(
    SELECT 1 FROM referrals
    WHERE referrer_id = v_referrer_id
      AND referred_id = p_filleul_id
      AND status = 'rewarded'
  ) INTO v_already_rewarded;

  IF v_already_rewarded THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_rewarded');
  END IF;

  -- 3. Récupérer les noms
  SELECT COALESCE(full_name, email, 'Utilisateur') INTO v_referrer_name
  FROM profiles WHERE id = v_referrer_id;

  SELECT COALESCE(full_name, email, 'Utilisateur') INTO v_filleul_name
  FROM profiles WHERE id = p_filleul_id;

  -- 4. Récupérer le code parrainage
  SELECT referral_code INTO v_referral_code
  FROM profiles WHERE id = v_referrer_id;

  -- ═══════════════════════════════════════
  -- 5. +10 CRÉDITS PARRAIN
  -- ═══════════════════════════════════════
  SELECT COALESCE(credits, 0) INTO v_referrer_credits
  FROM profiles WHERE id = v_referrer_id;

  v_referrer_new_credits := v_referrer_credits + p_reward_amount;

  UPDATE profiles
  SET credits = v_referrer_new_credits, updated_at = NOW()
  WHERE id = v_referrer_id;

  INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (v_referrer_id, p_reward_amount, 'addition',
    'Récompense parrainage — filleul ' || v_filleul_name,
    v_referrer_new_credits);

  -- ═══════════════════════════════════════
  -- 6. +10 CRÉDITS FILLEUL
  -- ═══════════════════════════════════════
  SELECT COALESCE(credits, 0) INTO v_filleul_credits
  FROM profiles WHERE id = p_filleul_id;

  v_filleul_new_credits := v_filleul_credits + p_reward_amount;

  UPDATE profiles
  SET credits = v_filleul_new_credits, updated_at = NOW()
  WHERE id = p_filleul_id;

  INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (p_filleul_id, p_reward_amount, 'addition',
    'Bonus de bienvenue parrainage — parrainé par ' || v_referrer_name,
    v_filleul_new_credits);

  -- ═══════════════════════════════════════
  -- 7. NOTIFICATIONS
  -- ═══════════════════════════════════════
  INSERT INTO notifications (user_id, notification_type, title, message)
  VALUES
    (v_referrer_id, 'system',
      '🎉 +10 Crédits de parrainage !',
      'Votre filleul ' || v_filleul_name || ' a souscrit un abonnement. Vous recevez 10 crédits !'),
    (p_filleul_id, 'system',
      '🎁 +10 Crédits de bienvenue !',
      'Merci d''avoir rejoint ChecksFleet via un parrainage ! Vous recevez 10 crédits bonus.');

  -- ═══════════════════════════════════════
  -- 8. METTRE À JOUR REFERRALS
  -- ═══════════════════════════════════════
  INSERT INTO referrals (referrer_id, referred_id, referral_code, status, reward_credits, rewarded_at)
  VALUES (v_referrer_id, p_filleul_id, COALESCE(v_referral_code, ''), 'rewarded', p_reward_amount, NOW())
  ON CONFLICT (referrer_id, referred_id)
  DO UPDATE SET
    status = 'rewarded',
    reward_credits = p_reward_amount,
    rewarded_at = NOW();

  -- 9. Retourner le résultat
  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'referrer_name', v_referrer_name,
    'referrer_new_credits', v_referrer_new_credits,
    'filleul_name', v_filleul_name,
    'filleul_new_credits', v_filleul_new_credits,
    'reward', p_reward_amount
  );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION grant_referral_reward(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_referral_reward(UUID, INT) TO service_role;

-- Aussi ajouter les policies admin manquantes (pour les autres opérations)
DROP POLICY IF EXISTS "Admin full access credit_transactions" ON public.credit_transactions;
CREATE POLICY "Admin full access credit_transactions" ON public.credit_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin full access notifications" ON public.notifications;
CREATE POLICY "Admin full access notifications" ON public.notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
