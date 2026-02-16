-- ================================================
-- FORCER LA DÉSACTIVATION DE RLS SUR STORAGE
-- ================================================
-- ATTENTION: Nécessite les permissions OWNER sur storage.objects
-- Si vous obtenez "must be owner", utilisez le Dashboard Supabase

-- Méthode 1: Tenter de désactiver RLS directement (peut échouer)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS désactivé sur storage.objects et storage.buckets' as status;

-- Vérification
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '❌ RLS encore activé'
    ELSE '✅ RLS désactivé'
  END as status
FROM pg_tables
WHERE schemaname = 'storage'
AND tablename IN ('objects', 'buckets');
