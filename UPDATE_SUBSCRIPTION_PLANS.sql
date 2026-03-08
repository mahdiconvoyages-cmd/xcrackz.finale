-- ============================================================================
-- MISE À JOUR DES PLANS D'ABONNEMENT
-- ============================================================================
-- Changements :
-- - Suppression du plan Essentiel (10€)
-- - Pro : 20€/mois, 20 crédits/mois (facturation annuelle 240€/an)
-- - Business : 50€/mois, 60 crédits/mois (facturation annuelle 600€/an)
-- - Premium (NOUVEAU) : 79.99€/mois, 150 crédits/mois (facturation annuelle 959.88€/an)
-- - Sur-mesure : sur devis
-- - Tous les paiements sont annuels
-- - 1 mission = 1 crédit, 1 mission + restitution = 2 crédits
-- - Les 10 crédits de bienvenue sont uniques (pas de crédits mensuels gratuits)
-- ============================================================================

-- 1. Désactiver les anciens plans obsolètes
UPDATE shop_items 
SET is_active = false, updated_at = NOW()
WHERE name IN ('free', 'basic', 'essentiel', 'starter')
  AND item_type = 'subscription';

-- 2. Mettre à jour le plan Pro
UPDATE shop_items 
SET 
  credits_amount = 20,
  price = 20.00,
  description = 'Plan Pro — 20 crédits/mois, accès complet',
  features = '{"features": ["20 crédits/mois", "Accès complet plateforme", "Missions, inspections, GPS, facturation", "Support prioritaire", "Facturation annuelle 240€/an"]}',
  display_order = 1,
  is_active = true,
  updated_at = NOW()
WHERE name = 'pro' AND item_type = 'subscription';

-- 3. Mettre à jour le plan Business
UPDATE shop_items 
SET 
  credits_amount = 60,
  price = 50.00,
  description = 'Plan Business — 60 crédits/mois, idéal flottes',
  features = '{"features": ["60 crédits/mois", "Accès complet plateforme", "Volume idéal flottes & équipes", "Support dédié téléphone", "Facturation annuelle 600€/an"]}',
  display_order = 2,
  is_active = true,
  updated_at = NOW()
WHERE name = 'business' AND item_type = 'subscription';

-- 4. Insérer le plan Premium s'il n'existe pas, sinon le mettre à jour
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM shop_items WHERE name = 'premium' AND item_type = 'subscription') THEN
    UPDATE shop_items SET
      credits_amount = 150,
      price = 79.99,
      description = 'Plan Premium — 150 crédits/mois, volume important',
      features = '{"features": ["150 crédits/mois", "Accès complet plateforme", "Volume important de missions", "Support dédié prioritaire", "Facturation annuelle 959.88€/an"]}',
      display_order = 3,
      is_active = true,
      updated_at = NOW()
    WHERE name = 'premium' AND item_type = 'subscription';
  ELSE
    INSERT INTO shop_items (name, description, item_type, credits_amount, price, currency, is_active, features, display_order)
    VALUES (
      'premium',
      'Plan Premium — 150 crédits/mois, volume important',
      'subscription',
      150,
      79.99,
      'EUR',
      true,
      '{"features": ["150 crédits/mois", "Accès complet plateforme", "Volume important de missions", "Support dédié prioritaire", "Facturation annuelle 959.88€/an"]}',
      3
    );
  END IF;
END $$;

-- 5. Mettre à jour le plan Enterprise (sur-mesure, sur devis)
UPDATE shop_items 
SET 
  credits_amount = 0,
  price = 0.00,
  description = 'Plan sur-mesure — sur devis',
  features = '{"features": ["Crédits sur mesure", "Tarification personnalisée", "Accompagnement dédié", "Formation équipes", "Sur devis"]}',
  display_order = 4,
  is_active = true,
  updated_at = NOW()
WHERE name = 'enterprise' AND item_type = 'subscription';

-- 6. Mettre à jour la fonction de distribution de crédits mensuels
CREATE OR REPLACE FUNCTION distribute_subscription_credits()
RETURNS TABLE(user_email text, plan text, credits_added integer, auto_renew boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
BEGIN
    FOR v_sub IN 
        SELECT 
            s.id,
            s.user_id,
            s.plan,
            s.auto_renew,
            s.current_period_end,
            p.email,
            CASE s.plan
                WHEN 'free' THEN 0
                WHEN 'starter' THEN 20
                WHEN 'essentiel' THEN 20
                WHEN 'basic' THEN 20
                WHEN 'pro' THEN 20          -- 20€/mois (240€/an)
                WHEN 'business' THEN 60     -- 50€/mois (600€/an)
                WHEN 'premium' THEN 150     -- 79.99€/mois (959.88€/an)
                WHEN 'enterprise' THEN 500  -- sur mesure
                ELSE 0
            END as monthly_credits
        FROM subscriptions s
        JOIN profiles p ON p.id = s.user_id
        WHERE s.status = 'active'
        AND s.auto_renew = true
        AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
        AND s.plan != 'free'
    LOOP
        -- Réinitialiser les crédits (non cumulables) dans profiles
        UPDATE profiles 
        SET credits = v_sub.monthly_credits
        WHERE id = v_sub.user_id;

        -- Sync user_credits (réinitialisation)
        UPDATE user_credits 
        SET balance = v_sub.monthly_credits
        WHERE user_id = v_sub.user_id;

        -- Logger la transaction
        INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
        VALUES (
            v_sub.user_id,
            v_sub.monthly_credits,
            'addition',
            'Renouvellement crédits mensuels — plan ' || UPPER(v_sub.plan),
            v_sub.monthly_credits
        );

        RETURN QUERY SELECT 
            v_sub.email::text, 
            v_sub.plan::text, 
            v_sub.monthly_credits::integer, 
            v_sub.auto_renew::boolean;
    END LOOP;
END;
$$;

-- 7. Mettre à jour la fonction d'assignation de crédits par plan
CREATE OR REPLACE FUNCTION assign_credits_for_plan()
RETURNS TRIGGER AS $$
DECLARE
  credit_amount INTEGER;
BEGIN
  IF NEW.status = 'active' THEN
    CASE NEW.plan
      WHEN 'free' THEN credit_amount := 0;
      WHEN 'essentiel' THEN credit_amount := 20;
      WHEN 'basic' THEN credit_amount := 20;
      WHEN 'starter' THEN credit_amount := 20;
      WHEN 'pro' THEN credit_amount := 20;
      WHEN 'business' THEN credit_amount := 60;
      WHEN 'premium' THEN credit_amount := 150;
      WHEN 'enterprise' THEN credit_amount := 500;
      ELSE credit_amount := 0;
    END CASE;

    INSERT INTO user_credits (user_id, balance)
    VALUES (NEW.user_id, credit_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = credit_amount;

    UPDATE profiles
    SET credits = credit_amount
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Migration des plans terminée avec succès' as result;
