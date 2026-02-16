-- ==========================================
-- 🔒 POLICIES STORAGE pour bucket scanned-documents
-- À exécuter dans Supabase SQL Editor
-- ==========================================

-- 1. Policy: Permettre aux utilisateurs authentifiés d'uploader leurs fichiers
CREATE POLICY "Allow authenticated users to upload their files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scanned-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Policy: Permettre aux utilisateurs de lire leurs propres fichiers
CREATE POLICY "Allow users to read their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scanned-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Policy: Permettre la lecture publique (car bucket public)
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'scanned-documents');

-- 4. Policy: Permettre aux utilisateurs de supprimer leurs propres fichiers
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scanned-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Policy: Permettre aux utilisateurs de mettre à jour leurs propres fichiers
CREATE POLICY "Allow users to update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'scanned-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ==========================================
-- ✅ Policies Storage configurées
-- ==========================================

-- Vérification des policies:
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%scanned-documents%';
