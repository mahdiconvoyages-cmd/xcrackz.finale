-- ================================================
-- RÉACTIVATION RLS AVEC POLITIQUES PROPRES
-- ================================================

-- 1. SUPPRIMER TOUTES LES ANCIENNES POLITIQUES
-- MISSIONS
DROP POLICY IF EXISTS "missions_view" ON missions;
DROP POLICY IF EXISTS "missions_create" ON missions;
DROP POLICY IF EXISTS "missions_modify" ON missions;
DROP POLICY IF EXISTS "missions_remove" ON missions;

-- CONTACTS
DROP POLICY IF EXISTS "contacts_view" ON contacts;
DROP POLICY IF EXISTS "contacts_create" ON contacts;
DROP POLICY IF EXISTS "contacts_modify" ON contacts;
DROP POLICY IF EXISTS "contacts_remove" ON contacts;
DROP POLICY IF EXISTS "Users can view contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts" ON contacts;

-- INVOICES (Factures)
DROP POLICY IF EXISTS "invoices_view" ON invoices;
DROP POLICY IF EXISTS "invoices_create" ON invoices;
DROP POLICY IF EXISTS "invoices_modify" ON invoices;
DROP POLICY IF EXISTS "invoices_remove" ON invoices;
DROP POLICY IF EXISTS "Users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;

-- QUOTES (Devis)
DROP POLICY IF EXISTS "quotes_view" ON quotes;
DROP POLICY IF EXISTS "quotes_create" ON quotes;
DROP POLICY IF EXISTS "quotes_modify" ON quotes;
DROP POLICY IF EXISTS "quotes_remove" ON quotes;
DROP POLICY IF EXISTS "Users can view quotes" ON quotes;
DROP POLICY IF EXISTS "Users can create quotes" ON quotes;
DROP POLICY IF EXISTS "Users can update quotes" ON quotes;
DROP POLICY IF EXISTS "Users can delete quotes" ON quotes;

-- CLIENTS
DROP POLICY IF EXISTS "clients_view" ON clients;
DROP POLICY IF EXISTS "clients_create" ON clients;
DROP POLICY IF EXISTS "clients_modify" ON clients;
DROP POLICY IF EXISTS "clients_remove" ON clients;
DROP POLICY IF EXISTS "Users can view clients" ON clients;
DROP POLICY IF EXISTS "Users can create clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;

-- USER_CREDITS
DROP POLICY IF EXISTS "credits_view" ON user_credits;
DROP POLICY IF EXISTS "credits_create" ON user_credits;
DROP POLICY IF EXISTS "credits_modify" ON user_credits;

-- VEHICLE_INSPECTIONS
DROP POLICY IF EXISTS "inspections_all" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_view" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_create" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_modify" ON vehicle_inspections;
DROP POLICY IF EXISTS "insp_owner_policy" ON vehicle_inspections;

-- INSPECTION_PHOTOS
DROP POLICY IF EXISTS "photos_all" ON inspection_photos;
DROP POLICY IF EXISTS "photos_view" ON inspection_photos;
DROP POLICY IF EXISTS "photos_create" ON inspection_photos;
DROP POLICY IF EXISTS "photos_policy" ON inspection_photos;
DROP POLICY IF EXISTS "Users can view inspection photos" ON inspection_photos;
DROP POLICY IF EXISTS "Users can create inspection photos" ON inspection_photos;
DROP POLICY IF EXISTS "Users can delete inspection photos" ON inspection_photos;

-- ================================================
-- 2. CRÉER LES NOUVELLES POLITIQUES PROPRES
-- ================================================

-- MISSIONS
CREATE POLICY "missions_view" ON missions
FOR SELECT
USING (
  auth.uid() = user_id OR 
  auth.uid() = assigned_to_user_id OR
  tracking_code IS NOT NULL
);

CREATE POLICY "missions_create" ON missions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "missions_modify" ON missions
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = assigned_to_user_id);

CREATE POLICY "missions_remove" ON missions
FOR DELETE
USING (auth.uid() = user_id);

-- CONTACTS
CREATE POLICY "contacts_view" ON contacts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "contacts_create" ON contacts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts_modify" ON contacts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "contacts_remove" ON contacts
FOR DELETE
USING (auth.uid() = user_id);

-- INVOICES (Factures)
CREATE POLICY "invoices_view" ON invoices
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "invoices_create" ON invoices
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoices_modify" ON invoices
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "invoices_remove" ON invoices
FOR DELETE
USING (auth.uid() = user_id);

-- QUOTES (Devis)
CREATE POLICY "quotes_view" ON quotes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "quotes_create" ON quotes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotes_modify" ON quotes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "quotes_remove" ON quotes
FOR DELETE
USING (auth.uid() = user_id);

-- CLIENTS
CREATE POLICY "clients_view" ON clients
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "clients_create" ON clients
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_modify" ON clients
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "clients_remove" ON clients
FOR DELETE
USING (auth.uid() = user_id);

-- USER_CREDITS
CREATE POLICY "credits_view" ON user_credits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "credits_create" ON user_credits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "credits_modify" ON user_credits
FOR UPDATE
USING (auth.uid() = user_id);

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

-- ================================================
-- 3. RÉACTIVER RLS SUR TOUTES LES TABLES
-- ================================================
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 4. VÉRIFICATION FINALE
-- ================================================
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('missions', 'contacts', 'invoices', 'quotes', 'clients', 'user_credits', 'vehicle_inspections', 'inspection_photos')
ORDER BY tablename, cmd;

SELECT '✅ RLS RÉACTIVÉ AVEC POLITIQUES PROPRES !' as status;
