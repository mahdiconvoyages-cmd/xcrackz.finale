-- ================================================
-- FIX: Mettre a jour le CHECK constraint report_type
-- pour accepter tous les types y compris restitution
-- Safe a executer plusieurs fois
-- ================================================

-- Supprimer l'ancien constraint
ALTER TABLE public.inspection_report_shares 
  DROP CONSTRAINT IF EXISTS inspection_report_shares_report_type_check;

-- Ajouter le nouveau constraint avec restitution types
ALTER TABLE public.inspection_report_shares 
  ADD CONSTRAINT inspection_report_shares_report_type_check 
  CHECK (report_type IN ('departure', 'arrival', 'complete', 'both', 'restitution_departure', 'restitution_arrival', 'restitution_complete'));

-- Mettre a jour les 'both' existants vers 'complete'
UPDATE public.inspection_report_shares 
  SET report_type = 'complete' 
  WHERE report_type = 'both';
