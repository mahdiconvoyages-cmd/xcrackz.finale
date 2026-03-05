-- ============================================
-- FIX IMMÉDIAT: Corriger le parrainage existant
-- Parrain: mahdi.benamor1994@gmail.com (code MAH-3DC7)
-- Filleul: convoiexpress95@gmail.com
-- ============================================

DO $$
DECLARE
  v_parrain_id UUID;
  v_filleul_id UUID;
  v_parrain_credits INT;
  v_filleul_credits INT;
  v_reward INT := 10;
BEGIN
  -- 1. Trouver les UUIDs
  SELECT id INTO v_parrain_id FROM profiles WHERE email = 'mahdi.benamor1994@gmail.com';
  SELECT id INTO v_filleul_id FROM profiles WHERE email = 'convoiexpress95@gmail.com';

  IF v_parrain_id IS NULL THEN
    RAISE EXCEPTION 'Parrain non trouvé: mahdi.benamor1994@gmail.com';
  END IF;
  IF v_filleul_id IS NULL THEN
    RAISE EXCEPTION 'Filleul non trouvé: convoiexpress95@gmail.com';
  END IF;

  -- 2. Lier le parrainage
  UPDATE profiles SET referred_by = v_parrain_id WHERE id = v_filleul_id AND referred_by IS NULL;

  -- 3. Insérer dans referrals
  INSERT INTO referrals (referrer_id, referred_id, referral_code, status, reward_credits, rewarded_at)
  VALUES (v_parrain_id, v_filleul_id, 'MAH-3DC7', 'rewarded', v_reward, NOW())
  ON CONFLICT (referrer_id, referred_id) DO UPDATE SET status = 'rewarded', reward_credits = v_reward, rewarded_at = NOW();

  -- 4. Donner +10 crédits au PARRAIN
  SELECT COALESCE(credits, 0) INTO v_parrain_credits FROM profiles WHERE id = v_parrain_id;
  UPDATE profiles SET credits = v_parrain_credits + v_reward, updated_at = NOW() WHERE id = v_parrain_id;

  INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (v_parrain_id, v_reward, 'addition', 
    'Récompense parrainage — filleul convoiexpress95@gmail.com', 
    v_parrain_credits + v_reward);

  -- 5. Donner +10 crédits au FILLEUL 
  SELECT COALESCE(credits, 0) INTO v_filleul_credits FROM profiles WHERE id = v_filleul_id;
  UPDATE profiles SET credits = v_filleul_credits + v_reward, updated_at = NOW() WHERE id = v_filleul_id;

  INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
  VALUES (v_filleul_id, v_reward, 'addition', 
    'Bonus de bienvenue parrainage — parrainé par mahdi.benamor1994@gmail.com', 
    v_filleul_credits + v_reward);

  -- 6. Notification au PARRAIN
  INSERT INTO notifications (user_id, notification_type, title, message)
  VALUES (
    v_parrain_id,
    'system',
    '🎉 +10 Crédits de parrainage !',
    'Votre filleul convoiexpress95@gmail.com a souscrit un abonnement. Vous recevez 10 crédits de récompense !'
  );

  -- 7. Notification au FILLEUL
  INSERT INTO notifications (user_id, notification_type, title, message)
  VALUES (
    v_filleul_id,
    'system',
    '🎁 +10 Crédits de bienvenue !',
    'Merci d''avoir rejoint ChecksFleet via un parrainage ! Vous recevez 10 crédits bonus.'
  );

  RAISE NOTICE '✅ Parrainage corrigé: parrain=% (+10 crédits = %), filleul=% (+10 crédits = %)', 
    v_parrain_id, v_parrain_credits + v_reward, v_filleul_id, v_filleul_credits + v_reward;
END;
$$;
