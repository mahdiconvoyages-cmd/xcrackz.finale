-- ================================================
-- POLITIQUES SÉPARÉES PAR OPÉRATION
-- ================================================

-- 1. SUPPRIMER TOUTES LES POLITIQUES
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 2. CRÉER 4 POLITIQUES SÉPARÉES POUR AUTHENTICATED
-- SELECT (lecture)
CREATE POLICY "authenticated_select" ON storage.objects
FOR SELECT
TO authenticated
USING (true);

-- INSERT (upload)
CREATE POLICY "authenticated_insert" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE (modification)
CREATE POLICY "authenticated_update" ON storage.objects
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE (suppression)
CREATE POLICY "authenticated_delete" ON storage.objects
FOR DELETE
TO authenticated
USING (true);

-- 3. POLITIQUE POUR ANON (lecture publique)
CREATE POLICY "anon_select" ON storage.objects
FOR SELECT
TO anon
USING (bucket_id IN ('avatars', 'vehicle-images', 'inspection-photos', 'company-logos', 'user-documents', 'missions'));

-- 4. RENDRE TOUS LES BUCKETS PUBLICS
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
UPDATE storage.buckets SET public = true WHERE id = 'vehicle-images';
UPDATE storage.buckets SET public = true WHERE id = 'inspection-photos';
UPDATE storage.buckets SET public = true WHERE id = 'company-logos';
UPDATE storage.buckets SET public = true WHERE id = 'user-documents';
UPDATE storage.buckets SET public = true WHERE id = 'missions';

-- 5. VÉRIFIER
SELECT 
  policyname,
  cmd,
  roles::text,
  SUBSTRING(qual::text, 1, 80) as using_clause,
  SUBSTRING(with_check::text, 1, 80) as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
ORDER BY cmd, policyname;

SELECT '✅ Politiques séparées créées (SELECT, INSERT, UPDATE, DELETE)' as status;
