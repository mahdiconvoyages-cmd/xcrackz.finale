-- ================================================
-- VÉRIFICATION DU BUCKET STORAGE MISSIONS
-- Le bucket 'missions' est déjà utilisé par le web
-- Mobile et Web partagent le MÊME bucket !
-- ================================================

-- Vérifier que le bucket 'missions' existe
SELECT 
  id,
  name,
  public,
  created_at,
  CASE 
    WHEN public = true THEN '✅ Bucket public - OK'
    ELSE '⚠️ Bucket privé - À vérifier'
  END as status
FROM storage.buckets
WHERE id = 'missions';

-- Vérifier les policies existantes pour le bucket 'missions'
SELECT 
  policyname,
  cmd,
  qual,
  '✅ Policy active' as status
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%mission%';

-- Si le bucket n'existe pas, le créer (normalement il existe déjà)
INSERT INTO storage.buckets (id, name, public)
VALUES ('missions', 'missions', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pour upload (si elles n'existent pas)
DO $$ 
BEGIN
  -- Policy pour upload
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload mission files'
  ) THEN
    CREATE POLICY "Authenticated users can upload mission files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'missions');
  END IF;

  -- Policy pour lecture publique
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view mission files'
  ) THEN
    CREATE POLICY "Public can view mission files"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'missions');
  END IF;

  -- Policy pour suppression
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own mission files'
  ) THEN
    CREATE POLICY "Users can delete their own mission files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'missions');
  END IF;
END $$;

-- Résultat final
SELECT 
  '✅ SYNCHRONISATION WEB-MOBILE' as message,
  'Bucket missions partagé entre web et mobile' as details,
  'vehicle-images/ utilisé pour les photos de véhicules' as path_structure;

