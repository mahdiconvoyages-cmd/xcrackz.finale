-- ================================================
-- SUPPRESSION TOTALE DES DOUBLONS
-- ================================================

-- DÉSACTIVER RLS
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos DISABLE ROW LEVEL SECURITY;

-- ================================================
-- INSPECTION_PHOTOS - Supprimer TOUS les doublons
-- ================================================
DROP POLICY IF EXISTS "photos_policy" ON inspection_photos;
DROP POLICY IF EXISTS "Users can delete inspection photos" ON inspection_photos;
DROP POLICY IF EXISTS "Users can create inspection photos" ON inspection_photos;
DROP POLICY IF EXISTS "photos_create" ON inspection_photos;
DROP POLICY IF EXISTS "Users can view inspection photos" ON inspection_photos;
DROP POLICY IF EXISTS "photos_view" ON inspection_photos;

-- ================================================
-- VEHICLE_INSPECTIONS - Supprimer TOUS les doublons
-- ================================================
DROP POLICY IF EXISTS "insp_owner_policy" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_create" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_view" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_modify" ON vehicle_inspections;

-- ================================================
-- RECRÉER PROPREMENT - UNE SEULE POLITIQUE PAR ACTION
-- ================================================

-- MISSIONS (déjà propres, on garde)

-- USER_CREDITS (déjà propres, on garde)

-- VEHICLE_INSPECTIONS
CREATE POLICY "inspections_all" ON vehicle_inspections
USING (
  EXISTS (
    SELECT 1 FROM missions m 
    WHERE m.id = vehicle_inspections.mission_id 
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid() OR m.tracking_code IS NOT NULL)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM missions m 
    WHERE m.id = vehicle_inspections.mission_id 
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- INSPECTION_PHOTOS
CREATE POLICY "photos_all" ON inspection_photos
USING (
  EXISTS (
    SELECT 1 FROM vehicle_inspections vi
    JOIN missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_photos.inspection_id
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid() OR m.tracking_code IS NOT NULL)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vehicle_inspections vi
    JOIN missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_photos.inspection_id
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- RÉACTIVER RLS
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

-- VÉRIFICATION FINALE
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('missions', 'user_credits', 'vehicle_inspections', 'inspection_photos')
ORDER BY tablename, policyname;

SELECT '🎉 TOUTES LES POLITIQUES NETTOYÉES !' as status;
