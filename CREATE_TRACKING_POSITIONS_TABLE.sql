-- Migration: Table tracking_positions pour le partage de position GPS en temps réel
-- Date: 2025-11-03
-- Description: Stocke les positions GPS des utilisateurs pendant les missions (toutes les 2s)

-- 1. Créer la table
CREATE TABLE IF NOT EXISTS public.tracking_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  speed_kmh NUMERIC(6, 2) DEFAULT 0,
  heading NUMERIC(5, 2) DEFAULT 0, -- Direction en degrés (0-360)
  accuracy NUMERIC(8, 2), -- Précision en mètres
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Créer les index pour optimiser les requêtes temps réel
CREATE INDEX idx_tracking_positions_mission ON public.tracking_positions(mission_id, recorded_at DESC);
CREATE INDEX idx_tracking_positions_user ON public.tracking_positions(user_id, recorded_at DESC);

-- 3. Activer Row Level Security (RLS)
ALTER TABLE public.tracking_positions ENABLE ROW LEVEL SECURITY;

-- 4. Policy INSERT : Seul l'utilisateur authentifié peut insérer ses propres positions
CREATE POLICY "Users can insert their own positions"
  ON public.tracking_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. Policy SELECT : Les positions sont visibles par :
--    - L'utilisateur lui-même
--    - Le créateur de la mission (user_id)
CREATE POLICY "Users can view positions from their missions"
  ON public.tracking_positions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    -- L'utilisateur est le créateur de la mission
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = tracking_positions.mission_id
      AND m.user_id = auth.uid()
    )
  );

-- 6. Policy DELETE : Seul l'utilisateur peut supprimer ses propres positions (nettoyage)
CREATE POLICY "Users can delete their own positions"
  ON public.tracking_positions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Fonction helper pour récupérer la dernière position d'une mission (utile pour polling)
CREATE OR REPLACE FUNCTION public.get_latest_position(p_mission_id UUID)
RETURNS TABLE (
  id UUID,
  mission_id UUID,
  user_id UUID,
  latitude NUMERIC,
  longitude NUMERIC,
  speed_kmh NUMERIC,
  heading NUMERIC,
  accuracy NUMERIC,
  recorded_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id,
    tp.mission_id,
    tp.user_id,
    tp.latitude,
    tp.longitude,
    tp.speed_kmh,
    tp.heading,
    tp.accuracy,
    tp.recorded_at
  FROM public.tracking_positions tp
  WHERE tp.mission_id = p_mission_id
  ORDER BY tp.recorded_at DESC
  LIMIT 1;
END;
$$;

-- 8. Fonction pour récupérer toutes les positions d'une mission (pour tracer la route complète)
CREATE OR REPLACE FUNCTION public.get_mission_positions(
  p_mission_id UUID,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  latitude NUMERIC,
  longitude NUMERIC,
  speed_kmh NUMERIC,
  heading NUMERIC,
  recorded_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id,
    tp.latitude,
    tp.longitude,
    tp.speed_kmh,
    tp.heading,
    tp.recorded_at
  FROM public.tracking_positions tp
  WHERE tp.mission_id = p_mission_id
  ORDER BY tp.recorded_at DESC
  LIMIT p_limit;
END;
$$;

-- 9. Commentaires pour documentation
COMMENT ON TABLE public.tracking_positions IS 'Stocke les positions GPS en temps réel des utilisateurs pendant les missions (collectées toutes les 2 secondes)';
COMMENT ON COLUMN public.tracking_positions.latitude IS 'Latitude en degrés décimaux (WGS84)';
COMMENT ON COLUMN public.tracking_positions.longitude IS 'Longitude en degrés décimaux (WGS84)';
COMMENT ON COLUMN public.tracking_positions.speed_kmh IS 'Vitesse en km/h au moment de l''enregistrement';
COMMENT ON COLUMN public.tracking_positions.heading IS 'Direction en degrés (0=Nord, 90=Est, 180=Sud, 270=Ouest)';
COMMENT ON COLUMN public.tracking_positions.accuracy IS 'Précision de la position en mètres (plus petit = plus précis)';
COMMENT ON COLUMN public.tracking_positions.recorded_at IS 'Timestamp exact de la mesure GPS (peut différer de created_at en cas de délai réseau)';

-- 10. Grant permissions (ajuster selon vos besoins)
GRANT SELECT, INSERT, DELETE ON public.tracking_positions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_position(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mission_positions(UUID, INT) TO authenticated;
