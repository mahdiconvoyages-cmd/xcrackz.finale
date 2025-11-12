-- ============================================
-- MIGRATION: inspection_damages table
-- Crée la table inspection_damages pour gérer les dommages détectés
-- ============================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.inspection_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.vehicle_inspections(id) ON DELETE CASCADE,
  damage_type TEXT NOT NULL, -- 'scratch', 'dent', 'crack', 'missing_part', etc.
  severity TEXT NOT NULL DEFAULT 'minor', -- 'minor', 'moderate', 'severe'
  location TEXT, -- Location on vehicle: 'front_bumper', 'driver_door', etc.
  description TEXT,
  photo_url TEXT, -- Reference to photo showing the damage
  detected_by TEXT, -- 'manual', 'ai', 'auto'
  confidence DECIMAL(3,2), -- AI confidence score (0.00 to 1.00)
  repaired BOOLEAN DEFAULT FALSE,
  repair_cost DECIMAL(10,2),
  repair_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inspection_damages_inspection_id 
  ON public.inspection_damages(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_damages_severity 
  ON public.inspection_damages(severity);
CREATE INDEX IF NOT EXISTS idx_inspection_damages_damage_type 
  ON public.inspection_damages(damage_type);

-- RLS policies
ALTER TABLE public.inspection_damages ENABLE ROW LEVEL SECURITY;

-- Users can view damages for inspections they have access to
DROP POLICY IF EXISTS "Users can view damages for their inspections" ON public.inspection_damages;
CREATE POLICY "Users can view damages for their inspections"
ON public.inspection_damages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON vi.mission_id = m.id
    WHERE vi.id = inspection_damages.inspection_id
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid() OR m.assigned_user_id = auth.uid())
  )
);

-- Users can insert damages for inspections they created
DROP POLICY IF EXISTS "Users can insert damages for their inspections" ON public.inspection_damages;
CREATE POLICY "Users can insert damages for their inspections"
ON public.inspection_damages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON vi.mission_id = m.id
    WHERE vi.id = inspection_damages.inspection_id
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid() OR m.assigned_user_id = auth.uid())
  )
);

-- Users can update/delete their own damages
DROP POLICY IF EXISTS "Users can update damages for their inspections" ON public.inspection_damages;
CREATE POLICY "Users can update damages for their inspections"
ON public.inspection_damages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON vi.mission_id = m.id
    WHERE vi.id = inspection_damages.inspection_id
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid() OR m.assigned_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete damages for their inspections" ON public.inspection_damages;
CREATE POLICY "Users can delete damages for their inspections"
ON public.inspection_damages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON vi.mission_id = m.id
    WHERE vi.id = inspection_damages.inspection_id
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid() OR m.assigned_user_id = auth.uid())
  )
);

-- Admins can do everything
DROP POLICY IF EXISTS "Admins have full access to damages" ON public.inspection_damages;
CREATE POLICY "Admins have full access to damages"
ON public.inspection_damages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = TRUE
  )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_inspection_damages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_inspection_damages_updated_at ON public.inspection_damages;
CREATE TRIGGER trigger_update_inspection_damages_updated_at
  BEFORE UPDATE ON public.inspection_damages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inspection_damages_updated_at();

COMMENT ON TABLE public.inspection_damages IS 'Dommages détectés lors des inspections véhicules';
COMMENT ON COLUMN public.inspection_damages.damage_type IS 'Type de dommage: scratch, dent, crack, missing_part, etc.';
COMMENT ON COLUMN public.inspection_damages.severity IS 'Gravité: minor, moderate, severe';
COMMENT ON COLUMN public.inspection_damages.confidence IS 'Score de confiance AI (0.00 à 1.00) si détecté automatiquement';
