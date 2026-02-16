-- ================================================
-- SOLUTION RADICALE - SUPPRIMER TOUTES LES POLITIQUES + ANON
-- ================================================

-- 1. LISTER TOUTES LES POLITIQUES ACTUELLES
SELECT 
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

-- 2. SUPPRIMER ABSOLUMENT TOUTES LES POLITIQUES
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

-- 3. CRÉER UNE SEULE POLITIQUE POUR AUTHENTICATED (sans WITH CHECK)
CREATE POLICY "authenticated_all_operations" ON storage.objects
FOR ALL
TO authenticated
USING (true);

-- 4. CRÉER UNE POLITIQUE POUR ANON (lecture seule)
CREATE POLICY "anon_read_public_buckets" ON storage.objects
FOR SELECT
TO anon
USING (bucket_id IN ('avatars', 'vehicle-images', 'inspection-photos', 'company-logos', 'user-documents', 'missions'));

-- 5. RENDRE TOUS LES BUCKETS PUBLICS
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
UPDATE storage.buckets SET public = true WHERE id = 'vehicle-images';
UPDATE storage.buckets SET public = true WHERE id = 'inspection-photos';
UPDATE storage.buckets SET public = true WHERE id = 'company-logos';
UPDATE storage.buckets SET public = true WHERE id = 'user-documents';
UPDATE storage.buckets SET public = true WHERE id = 'missions';

-- 6. VÉRIFIER LE RÉSULTAT
SELECT 
  'POLITIQUES FINALES' as info,
  policyname,
  cmd,
  roles::text,
  SUBSTRING(qual::text, 1, 100) as using_clause,
  SUBSTRING(with_check::text, 1, 100) as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

SELECT '✅ Politiques nettoyées - SANS WITH CHECK' as status;
