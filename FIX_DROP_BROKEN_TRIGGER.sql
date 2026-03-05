-- ============================================================================
-- SUPPRIMER LE TRIGGER CASSÉ QUI EMPÊCHE LA RÉCOMPENSE DU FILLEUL
-- ============================================================================
-- Le trigger trg_reward_referrer utilise user_notifications (table inexistante)
-- Cela fait ROLLBACK l'update de la subscription et empêche tout le flow.
-- Le code JS dans AdminUsers.tsx gère maintenant les récompenses directement.
-- ============================================================================

-- 1. Supprimer le trigger cassé
DROP TRIGGER IF EXISTS trg_reward_referrer ON public.subscriptions;

-- 2. Supprimer la fonction associée (optionnel, nettoyage)
DROP FUNCTION IF EXISTS reward_referrer_on_subscription();

-- 3. Vérifier que le trigger est bien supprimé
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgrelid = 'public.subscriptions'::regclass 
AND tgname = 'trg_reward_referrer';
-- ↑ Devrait retourner 0 lignes

-- ============================================================================
-- C'EST TOUT ! Le code JavaScript dans AdminUsers.tsx gère les récompenses
-- de parrainage directement quand l'admin attribue un abonnement.
-- ============================================================================
