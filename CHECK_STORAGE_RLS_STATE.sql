-- ================================================
-- VÉRIFIER L'ÉTAT COMPLET DE RLS SUR STORAGE
-- ================================================

-- 1. Vérifier si RLS est activé sur les tables storage
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS ACTIVÉ'
    ELSE '🔓 RLS DÉSACTIVÉ'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'storage'
AND tablename IN ('objects', 'buckets')
ORDER BY tablename;

-- 2. Compter les politiques sur storage.objects
SELECT 
  'storage.objects' as table_name,
  COUNT(*) as nombre_politiques
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

-- 3. Compter les politiques sur storage.buckets
SELECT 
  'storage.buckets' as table_name,
  COUNT(*) as nombre_politiques
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'buckets';

-- 4. Lister TOUTES les politiques existantes
SELECT 
  schemaname || '.' || tablename as table_complete,
  policyname,
  cmd as command,
  roles::text,
  SUBSTRING(qual::text, 1, 50) as using_clause,
  SUBSTRING(with_check::text, 1, 50) as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- 5. État des buckets
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  CASE 
    WHEN public THEN '✅ PUBLIC'
    ELSE '❌ PRIVÉ'
  END as access_status
FROM storage.buckets
ORDER BY name;

SELECT '📊 Diagnostic complet terminé' as status;
