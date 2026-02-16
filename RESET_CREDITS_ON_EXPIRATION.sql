-- ============================================
-- Script SQL: Reset des crédits pour abonnements expirés
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Fonction pour reset les crédits d'un utilisateur avec abonnement expiré
CREATE OR REPLACE FUNCTION reset_expired_subscription_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_user RECORD;
    user_credits INTEGER;
BEGIN
    -- Parcourir tous les abonnements expirés qui ont encore des crédits
    -- Note: current_period_end est le nom de la colonne de date d'expiration
    FOR expired_user IN 
        SELECT s.user_id, p.credits
        FROM subscriptions s
        JOIN profiles p ON p.id = s.user_id
        WHERE (s.status = 'expired' OR (s.current_period_end IS NOT NULL AND s.current_period_end < NOW()))
        AND p.credits > 0
    LOOP
        user_credits := expired_user.credits;
        
        -- Mettre les crédits à 0
        UPDATE profiles 
        SET credits = 0, updated_at = NOW() 
        WHERE id = expired_user.user_id;
        
        -- Mettre à jour le statut de l'abonnement si pas déjà fait
        UPDATE subscriptions 
        SET status = 'expired', updated_at = NOW() 
        WHERE user_id = expired_user.user_id 
        AND status != 'expired';
        
        -- Enregistrer la transaction
        INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after, created_at)
        VALUES (
            expired_user.user_id, 
            -user_credits, 
            'deduction', 
            'Crédits expirés - Abonnement terminé (auto-cleanup)',
            0,
            NOW()
        );
        
        RAISE NOTICE 'Reset crédits pour user %: % -> 0', expired_user.user_id, user_credits;
    END LOOP;
END;
$$;

-- 2. Exécuter immédiatement le nettoyage
SELECT reset_expired_subscription_credits();

-- 3. (Optionnel) Créer un cron job pour exécuter automatiquement toutes les heures
-- Nécessite l'extension pg_cron activée dans Supabase
-- SELECT cron.schedule('reset-expired-credits', '0 * * * *', 'SELECT reset_expired_subscription_credits()');

-- 4. Vérification: Afficher les utilisateurs avec abonnements expirés
SELECT 
    s.user_id,
    s.status,
    s.current_period_end as expires_at,
    p.credits,
    p.email
FROM subscriptions s
JOIN profiles p ON p.id = s.user_id
WHERE s.status = 'expired' 
   OR (s.current_period_end IS NOT NULL AND s.current_period_end < NOW())
ORDER BY s.current_period_end DESC;

-- 5. Trigger automatique: Reset crédits quand le statut passe à 'expired'
CREATE OR REPLACE FUNCTION trigger_reset_credits_on_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Si le statut passe à 'expired'
    IF NEW.status = 'expired' AND (OLD.status IS NULL OR OLD.status != 'expired') THEN
        -- Récupérer les crédits actuels
        SELECT credits INTO current_credits FROM profiles WHERE id = NEW.user_id;
        
        IF current_credits > 0 THEN
            -- Reset les crédits à 0
            UPDATE profiles SET credits = 0, updated_at = NOW() WHERE id = NEW.user_id;
            
            -- Enregistrer la transaction
            INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
            VALUES (NEW.user_id, -current_credits, 'deduction', 'Crédits expirés - Abonnement terminé', 0);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_subscription_expired ON subscriptions;
CREATE TRIGGER on_subscription_expired
    AFTER UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_reset_credits_on_expiration();

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Configuration terminée:';
    RAISE NOTICE '   - Fonction reset_expired_subscription_credits() créée';
    RAISE NOTICE '   - Trigger on_subscription_expired activé';
    RAISE NOTICE '   - Les crédits seront automatiquement reset à 0 quand un abonnement expire';
END $$;
