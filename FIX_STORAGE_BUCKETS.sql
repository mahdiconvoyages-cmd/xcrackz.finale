-- ================================================
-- DÉSACTIVER RLS SUR LES BUCKETS DE STOCKAGE
-- ================================================

-- 1. Désactiver RLS sur le bucket vehicle-images
UPDATE storage.buckets
SET public = true
WHERE id = 'vehicle-images';

-- 2. Supprimer les politiques RLS sur vehicle-images
DROP POLICY IF EXISTS "Users can upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_select" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_delete" ON storage.objects;

-- 3. Créer une politique simple pour vehicle-images
CREATE POLICY "vehicle_images_public" ON storage.objects
FOR ALL
USING (bucket_id = 'vehicle-images')
WITH CHECK (bucket_id = 'vehicle-images' AND auth.uid() IS NOT NULL);

-- 4. Même chose pour inspection-photos si besoin
UPDATE storage.buckets
SET public = true
WHERE id = 'inspection-photos';

DROP POLICY IF EXISTS "Users can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "inspection_photos_delete" ON storage.objects;

CREATE POLICY "inspection_photos_public" ON storage.objects
FOR ALL
USING (bucket_id = 'inspection-photos')
WITH CHECK (bucket_id = 'inspection-photos' AND auth.uid() IS NOT NULL);

-- 5. Vérifier les buckets
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets;

SELECT '✅ Buckets de stockage configurés !' as status;
