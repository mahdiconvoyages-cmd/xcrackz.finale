-- ================================================
-- CORRECTION BUCKET AVATARS + CARPOOLING
-- ================================================

-- 1. RENDRE LE BUCKET AVATARS PUBLIC
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';

-- 2. SUPPRIMER LES POLITIQUES RLS SUR AVATARS
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "avatar_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatar_select" ON storage.objects;
DROP POLICY IF EXISTS "avatar_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public" ON storage.objects;

-- 3. CRÉER UNE POLITIQUE SIMPLE POUR AVATARS
CREATE POLICY "avatars_public" ON storage.objects
FOR ALL
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- 4. VÉRIFIER LA TABLE CARPOOLING_MESSAGES
-- Si la table existe, vérifier les colonnes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'carpooling_messages'
ORDER BY ordinal_position;

-- 5. VÉRIFIER LES FOREIGN KEYS
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'carpooling_messages';

SELECT '✅ Bucket avatars configuré - Vérifiez carpooling_messages' as status;
