-- ================================================
-- DÉSACTIVER RLS TEMPORAIREMENT POUR TOUT RETROUVER
-- ================================================

-- DÉSACTIVER RLS
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos DISABLE ROW LEVEL SECURITY;

-- Buckets publics
UPDATE storage.buckets SET public = true WHERE id = 'vehicle-images';
UPDATE storage.buckets SET public = true WHERE id = 'inspection-photos';

SELECT '✅ RLS DÉSACTIVÉ - Rafraîchissez votre navigateur !' as status;
