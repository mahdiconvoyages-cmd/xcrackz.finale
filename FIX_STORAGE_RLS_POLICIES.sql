-- ============================================
-- FIX STORAGE RLS POLICIES - INSPECTION PHOTOS
-- ============================================

-- 1. Supprimer les anciennes policies restrictives si elles existent
DROP POLICY IF EXISTS "Users can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update inspection photos" ON storage.objects;

-- 2. Créer des policies permissives pour les photos d'inspection

-- POLICY UPLOAD - Permettre aux utilisateurs authentifiés d'uploader dans inspection-photos
CREATE POLICY "Allow authenticated users to upload inspection photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-photos'
);

-- POLICY SELECT - Permettre à tous de voir les photos (ou seulement authentifiés si vous préférez)
CREATE POLICY "Allow public to view inspection photos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'inspection-photos'
);

-- POLICY UPDATE - Permettre aux propriétaires de mettre à jour leurs photos
CREATE POLICY "Allow users to update their inspection photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inspection-photos' 
  AND auth.uid()::text = owner
)
WITH CHECK (
  bucket_id = 'inspection-photos'
);

-- POLICY DELETE - Permettre aux propriétaires de supprimer leurs photos
CREATE POLICY "Allow users to delete their inspection photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-photos' 
  AND auth.uid()::text = owner
);

-- 3. Vérifier que le bucket existe et est configuré correctement
DO $$
BEGIN
  -- Vérifier si le bucket existe
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'inspection-photos'
  ) THEN
    -- Créer le bucket s'il n'existe pas
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'inspection-photos',
      'inspection-photos',
      true, -- Public pour faciliter l'accès
      52428800, -- 50MB limit
      ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    );
    RAISE NOTICE '✅ Bucket inspection-photos créé';
  ELSE
    -- Mettre à jour le bucket existant pour s'assurer qu'il est public
    UPDATE storage.buckets
    SET public = true,
        file_size_limit = 52428800,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    WHERE id = 'inspection-photos';
    RAISE NOTICE '✅ Bucket inspection-photos mis à jour';
  END IF;
END $$;

-- 4. Vérifier les policies créées
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%inspection%'
ORDER BY policyname;

-- 5. Afficher un résumé
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ POLICIES STORAGE CONFIGURÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📤 Upload: Tous les utilisateurs authentifiés';
  RAISE NOTICE '👁️  View: Public (tous)';
  RAISE NOTICE '✏️  Update: Propriétaires uniquement';
  RAISE NOTICE '🗑️  Delete: Propriétaires uniquement';
  RAISE NOTICE '========================================';
END $$;
