-- ============================================
-- CORRIGER LE BUCKET & RLS POUR LES PHOTOS
-- ============================================
-- À exécuter SI le diagnostic montre des problèmes d'accès

-- 1. S'assurer que le bucket inspection-photos existe et est PUBLIC
DO $$
BEGIN
  -- Vérifier si le bucket existe
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'inspection-photos') THEN
    -- Créer le bucket s'il n'existe pas
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'inspection-photos',
      'inspection-photos',
      true, -- PUBLIC pour accès direct
      52428800, -- 50 MB
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
    );
    RAISE NOTICE '✅ Bucket inspection-photos créé (PUBLIC)';
  ELSE
    -- Mettre à jour le bucket existant pour le rendre public
    UPDATE storage.buckets
    SET 
      public = true,
      file_size_limit = 52428800,
      allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
    WHERE id = 'inspection-photos';
    RAISE NOTICE '✅ Bucket inspection-photos mis à jour (PUBLIC)';
  END IF;
END $$;

-- 2. SUPPRIMER les anciennes policies restrictives
DROP POLICY IF EXISTS "Authenticated users can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to inspection-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read inspection-photos" ON storage.objects;

-- 3. CRÉER des policies simples et permissives

-- Policy 1: Permettre aux utilisateurs authentifiés d'UPLOADER
CREATE POLICY "inspection_photos_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

-- Policy 2: Permettre à TOUT LE MONDE de LIRE (car bucket public)
CREATE POLICY "inspection_photos_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'inspection-photos');

-- Policy 3: Permettre aux utilisateurs authentifiés de METTRE À JOUR leurs propres fichiers
CREATE POLICY "inspection_photos_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'inspection-photos')
WITH CHECK (bucket_id = 'inspection-photos');

-- Policy 4: Permettre aux utilisateurs authentifiés de SUPPRIMER
CREATE POLICY "inspection_photos_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'inspection-photos');

-- 4. VÉRIFIER que les policies sont bien créées
SELECT 
  '✅ POLICIES CRÉÉES' as status,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Lecture'
    WHEN cmd = 'INSERT' THEN 'Upload'
    WHEN cmd = 'UPDATE' THEN 'Modification'
    WHEN cmd = 'DELETE' THEN 'Suppression'
    ELSE cmd
  END as action,
  CASE 
    WHEN qual IS NULL THEN 'Tous'
    ELSE 'Conditions appliquées'
  END as qui_peut
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%inspection_photos%'
ORDER BY cmd;

-- 5. TESTER l'accès public
SELECT 
  '🧪 TEST ACCÈS PUBLIC' as status,
  id as bucket_name,
  public as is_public,
  CASE 
    WHEN public = true THEN '✅ Bucket PUBLIC - URLs accessibles directement'
    ELSE '⚠️ Bucket PRIVÉ - Nécessite signed URLs'
  END as access_type
FROM storage.buckets
WHERE id = 'inspection-photos';

-- 6. EXEMPLE D'URL PUBLIQUE (pour vérifier)
SELECT 
  '🔗 EXEMPLE URL PUBLIQUE' as info,
  'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/' || name as public_url
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
LIMIT 1;

-- 7. MESSAGE DE CONFIRMATION
SELECT '✅ Configuration bucket et RLS terminée' as message
UNION ALL
SELECT '📝 Le bucket inspection-photos est maintenant PUBLIC'
UNION ALL
SELECT '🔓 Les photos sont accessibles sans authentification via URL directe';
