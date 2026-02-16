-- Migration: Ajout colonne client_email et trigger auto-envoi email après validation inspection
-- Date: 2025-11-03
-- Description: Permet de stocker l'email du client et déclencher l'envoi automatique du rapport

-- 1. Ajouter colonne client_email dans vehicle_inspections
ALTER TABLE public.vehicle_inspections 
ADD COLUMN IF NOT EXISTS client_email TEXT;

-- 2. Ajouter colonne status si elle n'existe pas déjà
ALTER TABLE public.vehicle_inspections 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- 3. Commentaires
COMMENT ON COLUMN public.vehicle_inspections.client_email IS 'Email du client qui recevra automatiquement le rapport d''inspection (PDF + photos ZIP)';
COMMENT ON COLUMN public.vehicle_inspections.status IS 'Statut: draft, validated, sent';

-- 4. Index pour les requêtes
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_status ON public.vehicle_inspections(status);

-- Note: Le trigger sera créé après le déploiement de la fonction Edge
-- Pour l'instant, l'envoi sera déclenché manuellement depuis l'app mobile/web
-- après validation de l'inspection
