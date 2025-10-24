-- ================================================
-- DÉSACTIVER COMPLÈTEMENT RLS SUR STORAGE
-- ================================================
-- Cette approche supprime TOUTES les politiques et rend les buckets publics
-- sans RLS pour résoudre définitivement le problème

-- 1. SUPPRIMER TOUTES LES POLITIQUES SUR storage.objects
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
    RAISE NOTICE 'Supprimé: %', pol.policyname;
  END LOOP;
END $$;

-- 2. SUPPRIMER TOUTES LES POLITIQUES SUR storage.buckets
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'buckets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.buckets', pol.policyname);
    RAISE NOTICE 'Supprimé: %', pol.policyname;
  END LOOP;
END $$;

-- 3. METTRE TOUS LES BUCKETS EN PUBLIC
UPDATE storage.buckets 
SET public = true
WHERE name IN (
  'avatars',
  'vehicle-images',
  'inspection-photos',
  'missions',
  'company-logos',
  'user-documents'
);

-- 4. VÉRIFIER QU'IL NE RESTE PLUS DE POLITIQUES
SELECT 
  'POLITIQUES RESTANTES sur storage.objects' as info,
  COUNT(*) as nombre
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

SELECT 
  'POLITIQUES RESTANTES sur storage.buckets' as info,
  COUNT(*) as nombre
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'buckets';

-- 5. VÉRIFIER L'ÉTAT DES BUCKETS
SELECT 
  'ÉTAT FINAL DES BUCKETS' as info,
  name,
  public,
  CASE 
    WHEN public THEN '✅ Public - Upload autorisé'
    ELSE '❌ Privé - Upload bloqué'
  END as status
FROM storage.buckets
ORDER BY name;

SELECT '✅ TOUTES les politiques RLS supprimées - Les buckets sont maintenant PUBLICS' as resultat;
