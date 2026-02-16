/*
  # Storage Policies for Buckets

  ## Buckets créés
  - avatars: Photos de profil utilisateurs (5 MB max)
  - vehicle-images: Images de véhicules (10 MB max)
  - inspection-photos: Photos d'inspections (10 MB max)

  ## Politiques RLS

  ### Bucket avatars
  - Les utilisateurs authentifiés peuvent uploader leurs propres avatars
  - Les utilisateurs authentifiés peuvent lire tous les avatars
  - Les utilisateurs authentifiés peuvent mettre à jour leurs propres avatars
  - Les utilisateurs authentifiés peuvent supprimer leurs propres avatars

  ### Bucket vehicle-images
  - Les utilisateurs authentifiés peuvent uploader des images de véhicules
  - Tout le monde peut voir les images de véhicules (public)
  - Les utilisateurs authentifiés peuvent supprimer leurs propres images

  ### Bucket inspection-photos
  - Les utilisateurs authentifiés peuvent uploader des photos d'inspection
  - Les utilisateurs authentifiés peuvent voir toutes les photos (pour missions partagées)
  - Les utilisateurs authentifiés peuvent supprimer leurs propres photos
*/

-- RLS Policies pour bucket avatars

-- Permettre à tous de lire les avatars (public)
CREATE POLICY "Public avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Permettre aux utilisateurs authentifiés d'uploader leurs avatars
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permettre aux utilisateurs de mettre à jour leurs avatars
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ((storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK ((storage.foldername(name))[1] = auth.uid()::text);

-- Permettre aux utilisateurs de supprimer leurs avatars
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ((storage.foldername(name))[1] = auth.uid()::text);

-- RLS Policies pour bucket vehicle-images

-- Permettre à tous de lire les images de véhicules
CREATE POLICY "Vehicle images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-images');

-- Permettre aux utilisateurs authentifiés d'uploader des images
CREATE POLICY "Authenticated users can upload vehicle images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images');

-- Permettre aux utilisateurs de supprimer leurs images
CREATE POLICY "Users can delete their own vehicle images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicle-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS Policies pour bucket inspection-photos

-- Permettre aux utilisateurs authentifiés de lire les photos d'inspection
CREATE POLICY "Authenticated users can view inspection photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'inspection-photos');

-- Permettre aux utilisateurs authentifiés d'uploader des photos
CREATE POLICY "Authenticated users can upload inspection photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inspection-photos');

-- Permettre aux utilisateurs de supprimer leurs photos
CREATE POLICY "Users can delete inspection photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'inspection-photos');