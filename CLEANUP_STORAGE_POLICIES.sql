-- ================================================================
-- NETTOYAGE: Supprimer les policies storage en double
-- ================================================================
-- Garder uniquement 3 policies propres: SELECT (public), INSERT, UPDATE+DELETE (authenticated)
-- ================================================================

-- Supprimer TOUTES les policies existantes pour inspection-photos
DROP POLICY IF EXISTS "Allow authenticated users to upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_delete" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_upload" ON storage.objects;

-- Recréer 4 policies propres
-- 1. Lecture publique (pour les URLs publiques des rapports)
CREATE POLICY "insp_photos_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'inspection-photos');

-- 2. Upload (authenticated)
CREATE POLICY "insp_photos_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

-- 3. Update (authenticated)
CREATE POLICY "insp_photos_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'inspection-photos');

-- 4. Delete (authenticated)
CREATE POLICY "insp_photos_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inspection-photos');

-- Vérification
SELECT policyname, tablename FROM pg_policies 
WHERE policyname LIKE '%insp_photos%' AND schemaname = 'storage'
ORDER BY policyname;
