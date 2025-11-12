-- ================================================
-- Migration: ADD_INSPECTION_DAMAGES_TABLE.sql
-- Purpose: Introduce inspection_damages table referenced in advanced
--          inspection report service to eliminate repeated 404s.
-- ================================================

CREATE TABLE IF NOT EXISTS public.inspection_damages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.vehicle_inspections(id) ON DELETE CASCADE,
  damage_location text,                  -- e.g. 'front-left door'
  damage_severity text CHECK (damage_severity IN ('minor','moderate','severe')),
  description text,
  photo_url text,                        -- direct URL to stored photo (optional)
  created_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_inspection_damages_inspection_id ON public.inspection_damages(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_damages_severity ON public.inspection_damages(damage_severity);

-- Enable RLS
ALTER TABLE public.inspection_damages ENABLE ROW LEVEL SECURITY;

-- Policies: Users can manage damages for inspections belonging to their missions.
-- We derive mission ownership through vehicle_inspections -> missions.
DROP POLICY IF EXISTS "Users can view own inspection damages" ON public.inspection_damages;
CREATE POLICY "Users can view own inspection damages" ON public.inspection_damages
  FOR SELECT TO authenticated USING (
    auth.uid() = (
      SELECT m.user_id FROM public.missions m
      JOIN public.vehicle_inspections vi ON vi.mission_id = m.id
      WHERE vi.id = inspection_damages.inspection_id
    )
  );

DROP POLICY IF EXISTS "Users can insert own inspection damages" ON public.inspection_damages;
CREATE POLICY "Users can insert own inspection damages" ON public.inspection_damages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = (
      SELECT m.user_id FROM public.missions m
      JOIN public.vehicle_inspections vi ON vi.mission_id = m.id
      WHERE vi.id = inspection_damages.inspection_id
    )
  );

DROP POLICY IF EXISTS "Users can update own inspection damages" ON public.inspection_damages;
CREATE POLICY "Users can update own inspection damages" ON public.inspection_damages
  FOR UPDATE TO authenticated USING (
    auth.uid() = (
      SELECT m.user_id FROM public.missions m
      JOIN public.vehicle_inspections vi ON vi.mission_id = m.id
      WHERE vi.id = inspection_damages.inspection_id
    )
  ) WITH CHECK (
    auth.uid() = (
      SELECT m.user_id FROM public.missions m
      JOIN public.vehicle_inspections vi ON vi.mission_id = m.id
      WHERE vi.id = inspection_damages.inspection_id
    )
  );

DROP POLICY IF EXISTS "Users can delete own inspection damages" ON public.inspection_damages;
CREATE POLICY "Users can delete own inspection damages" ON public.inspection_damages
  FOR DELETE TO authenticated USING (
    auth.uid() = (
      SELECT m.user_id FROM public.missions m
      JOIN public.vehicle_inspections vi ON vi.mission_id = m.id
      WHERE vi.id = inspection_damages.inspection_id
    )
  );

-- Optional future enhancements:
-- - Add geometry column for precise damage location
-- - Add multiple photos table (inspection_damage_photos) if needed
-- - Add audit columns (updated_at, updated_by)
