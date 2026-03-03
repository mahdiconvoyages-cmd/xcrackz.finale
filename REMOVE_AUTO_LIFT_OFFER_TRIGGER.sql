-- ============================================================================
-- REMOVE: Auto ride offer creation when mission starts
-- ============================================================================
-- PROBLÈME: Quand une mission passe en "in_progress", un trigger Supabase
-- crée automatiquement une offre de lift dans ride_offers.
-- Le convoyeur n'a jamais demandé ça — ça doit rester optionnel.
--
-- SOLUTION: Supprimer le trigger et la fonction.
-- Le convoyeur pourra toujours proposer un lift manuellement via l'app.
-- ============================================================================

-- 1. Supprimer le trigger sur la table missions
DROP TRIGGER IF EXISTS trg_auto_ride_offer ON public.missions;

-- 2. Supprimer la fonction trigger
DROP FUNCTION IF EXISTS public.auto_create_ride_offer_from_mission();

-- 3. Nettoyer les offres auto-créées qui n'ont jamais été utilisées (optionnel)
-- Décommenter si vous voulez purger les offres fantômes :
-- DELETE FROM public.ride_offers
-- WHERE notes LIKE 'Place disponible — convoyage%'
--   AND status = 'active'
--   AND created_at < NOW() - INTERVAL '7 days';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
-- Exécuter pour confirmer que le trigger n'existe plus :
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.missions'::regclass;
-- ============================================================================
