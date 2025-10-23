-- Migration pour ajouter les champs de tracking GPS aux missions

-- Ajouter les colonnes de tracking
ALTER TABLE missions
ADD COLUMN IF NOT EXISTS public_tracking_link TEXT,
ADD COLUMN IF NOT EXISTS tracking_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tracking_ended_at TIMESTAMPTZ;

-- Index pour recherche rapide par lien de tracking
CREATE INDEX IF NOT EXISTS idx_missions_tracking_link 
  ON missions(public_tracking_link) 
  WHERE public_tracking_link IS NOT NULL;

-- Commentaires
COMMENT ON COLUMN missions.public_tracking_link IS 'Token unique pour le partage du suivi GPS en temps réel';
COMMENT ON COLUMN missions.tracking_started_at IS 'Date/heure de début du tracking GPS';
COMMENT ON COLUMN missions.tracking_ended_at IS 'Date/heure de fin du tracking GPS';
