-- ================================================
-- NETTOYAGE COMPLET DES POLITIQUES RLS
-- On garde SEULEMENT les politiques nécessaires
-- ================================================

-- DÉSACTIVER RLS temporairement
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos DISABLE ROW LEVEL SECURITY;

-- SUPPRIMER TOUTES les anciennes politiques missions
DROP POLICY IF EXISTS "Public can view missions with tracking code" ON missions;
DROP POLICY IF EXISTS "Users can create own missions" ON missions;
DROP POLICY IF EXISTS "read_assigned_missions" ON missions;
DROP POLICY IF EXISTS "missions_delete_policy" ON missions;
DROP POLICY IF EXISTS "missions_insert_policy" ON missions;
DROP POLICY IF EXISTS "missions_select_policy" ON missions;
DROP POLICY IF EXISTS "missions_update_policy" ON missions;

-- SUPPRIMER TOUTES les anciennes politiques user_credits
DROP POLICY IF EXISTS "Admins can insert any user credits" ON user_credits;
DROP POLICY IF EXISTS "Admins can update any user credits" ON user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "credits_select_policy" ON user_credits;
DROP POLICY IF EXISTS "credits_insert_policy" ON user_credits;
DROP POLICY IF EXISTS "credits_update_policy" ON user_credits;

-- ================================================
-- MISSIONS - Politiques propres
-- ================================================

-- SELECT : Créateur OU Assigné OU tracking_code public
CREATE POLICY "missions_view" ON missions
FOR SELECT USING (
  auth.uid() = user_id OR 
  auth.uid() = assigned_to_user_id OR
  tracking_code IS NOT NULL
);

-- INSERT : Authentifié seulement
CREATE POLICY "missions_create" ON missions
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- UPDATE : Créateur OU Assigné
CREATE POLICY "missions_modify" ON missions
FOR UPDATE USING (
  auth.uid() = user_id OR 
  auth.uid() = assigned_to_user_id
);

-- DELETE : Créateur seulement
CREATE POLICY "missions_remove" ON missions
FOR DELETE USING (
  auth.uid() = user_id
);

-- ================================================
-- USER_CREDITS - Politiques simples
-- ================================================

-- SELECT : Ses propres crédits OU admin
CREATE POLICY "credits_view" ON user_credits
FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- INSERT : Ses propres crédits OU admin
CREATE POLICY "credits_create" ON user_credits
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- UPDATE : Ses propres crédits OU admin
CREATE POLICY "credits_modify" ON user_credits
FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ================================================
-- VEHICLE_INSPECTIONS - Via missions
-- ================================================

DROP POLICY IF EXISTS "inspections_select_policy" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_insert_policy" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_update_policy" ON vehicle_inspections;

CREATE POLICY "inspections_view" ON vehicle_inspections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM missions m 
    WHERE m.id = vehicle_inspections.mission_id 
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid() OR m.tracking_code IS NOT NULL)
  )
);

CREATE POLICY "inspections_create" ON vehicle_inspections
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM missions m 
    WHERE m.id = vehicle_inspections.mission_id 
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

CREATE POLICY "inspections_modify" ON vehicle_inspections
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM missions m 
    WHERE m.id = vehicle_inspections.mission_id 
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- ================================================
-- INSPECTION_PHOTOS - Via inspections
-- ================================================

DROP POLICY IF EXISTS "photos_select_policy" ON inspection_photos;
DROP POLICY IF EXISTS "photos_insert_policy" ON inspection_photos;
DROP POLICY IF EXISTS "inspection_photos_select" ON inspection_photos;
DROP POLICY IF EXISTS "inspection_photos_insert" ON inspection_photos;

CREATE POLICY "photos_view" ON inspection_photos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM vehicle_inspections vi
    JOIN missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_photos.inspection_id
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid() OR m.tracking_code IS NOT NULL)
  )
);

CREATE POLICY "photos_create" ON inspection_photos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM vehicle_inspections vi
    JOIN missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_photos.inspection_id
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- ================================================
-- RÉACTIVER RLS
-- ================================================

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

-- ================================================
-- VÉRIFICATION
-- ================================================

SELECT '✅ Politiques nettoyées et recréées!' as status;

-- Voir les nouvelles politiques
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('missions', 'user_credits', 'vehicle_inspections', 'inspection_photos')
ORDER BY tablename, cmd, policyname;
