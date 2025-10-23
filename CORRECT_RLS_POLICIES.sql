-- ================================================
-- POLITIQUES RLS CORRECTES
-- Créateur + Assigné peuvent voir/modifier
-- ================================================

-- MISSIONS
-- Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "Users can view all missions" ON missions;
DROP POLICY IF EXISTS "Users can insert missions" ON missions;
DROP POLICY IF EXISTS "Users can update missions" ON missions;
DROP POLICY IF EXISTS "Users can delete missions" ON missions;

-- NOUVELLES POLITIQUES MISSIONS
-- SELECT : Créateur OU Assigné peuvent voir
CREATE POLICY "missions_select_policy" ON missions
FOR SELECT USING (
  auth.uid() = user_id OR 
  auth.uid() = assigned_to_user_id
);

-- INSERT : Tout le monde peut créer (coûte 1 crédit)
CREATE POLICY "missions_insert_policy" ON missions
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- UPDATE : Créateur OU Assigné peuvent modifier
CREATE POLICY "missions_update_policy" ON missions
FOR UPDATE USING (
  auth.uid() = user_id OR 
  auth.uid() = assigned_to_user_id
);

-- DELETE : Seulement le créateur
CREATE POLICY "missions_delete_policy" ON missions
FOR DELETE USING (
  auth.uid() = user_id
);

-- VEHICLE_INSPECTIONS
DROP POLICY IF EXISTS "Users can view all inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Users can insert inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Users can update inspections" ON vehicle_inspections;

-- SELECT : Via la mission (créateur OU assigné)
CREATE POLICY "inspections_select_policy" ON vehicle_inspections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM missions m 
    WHERE m.id = vehicle_inspections.mission_id 
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- INSERT : Via la mission
CREATE POLICY "inspections_insert_policy" ON vehicle_inspections
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM missions m 
    WHERE m.id = vehicle_inspections.mission_id 
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- UPDATE : Via la mission
CREATE POLICY "inspections_update_policy" ON vehicle_inspections
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM missions m 
    WHERE m.id = vehicle_inspections.mission_id 
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- INSPECTION_PHOTOS
DROP POLICY IF EXISTS "inspection_photos_select" ON inspection_photos;
DROP POLICY IF EXISTS "inspection_photos_insert" ON inspection_photos;
DROP POLICY IF EXISTS "inspection_photos_update" ON inspection_photos;
DROP POLICY IF EXISTS "inspection_photos_delete" ON inspection_photos;

-- SELECT : Via l'inspection -> mission
CREATE POLICY "photos_select_policy" ON inspection_photos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM vehicle_inspections vi
    JOIN missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_photos.inspection_id
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- INSERT : Via l'inspection
CREATE POLICY "photos_insert_policy" ON inspection_photos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM vehicle_inspections vi
    JOIN missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_photos.inspection_id
    AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- USER_CREDITS
DROP POLICY IF EXISTS "Users can view their credits" ON user_credits;
DROP POLICY IF EXISTS "Users can insert their credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update their credits" ON user_credits;

-- Chaque utilisateur voit SEULEMENT ses propres crédits
CREATE POLICY "credits_select_policy" ON user_credits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "credits_insert_policy" ON user_credits
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "credits_update_policy" ON user_credits
FOR UPDATE USING (auth.uid() = user_id);

-- ACTIVER RLS
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Créer user_credits pour l'utilisateur actuel
INSERT INTO user_credits (user_id, balance)
VALUES ('784dd826-62ae-4d94-81a0-618953d63010', 500)
ON CONFLICT (user_id) DO UPDATE SET balance = user_credits.balance;

RAISE NOTICE '✅ Politiques RLS configurées correctement !';
