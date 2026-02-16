-- ================================================
-- Migration: Ajouter des colonnes d'audit de complétion sur public.missions
-- Objectif:
--  - completed_at (timestampz)
--  - completed_by (uuid)
--  - completed_via (text) avec contrainte de valeurs autorisées
--  - completed_reason (text)
-- Notes:
--  - Idempotent via IF NOT EXISTS / vérif de contrainte
--  - Pas de clé étrangère sur completed_by pour éviter couplage strict avec auth.users
--  - Des index utiles sont ajoutés pour status et completed_at
-- ================================================

-- Colonnes
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS completed_by UUID;

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS completed_via TEXT;

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS completed_reason TEXT;

-- Contrainte CHECK sur completed_via (si non existante)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'missions_completed_via_check'
           AND conrelid = 'public.missions'::regclass
  ) THEN
    ALTER TABLE public.missions
      ADD CONSTRAINT missions_completed_via_check
      CHECK (
        completed_via IS NULL OR completed_via IN (
          'web', 'mobile', 'rpc', 'backend', 'admin', 'system'
        )
      );
  END IF;
END$$;

-- Index utiles (idempotents)
CREATE INDEX IF NOT EXISTS idx_missions_status ON public.missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_completed_at ON public.missions(completed_at);

-- Commentaires (documentation)
COMMENT ON COLUMN public.missions.completed_at IS 'Horodatage de complétion de la mission';
COMMENT ON COLUMN public.missions.completed_by IS 'UID de l''utilisateur ayant complété la mission (auth.uid())';
COMMENT ON COLUMN public.missions.completed_via IS 'Origine de la complétion: web|mobile|rpc|backend|admin|system';
COMMENT ON COLUMN public.missions.completed_reason IS 'Raison ou commentaire de la complétion';
