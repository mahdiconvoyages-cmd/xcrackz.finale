-- ==========================================
-- 🔍 DIAGNOSTIC ERREUR 400 - INSERT inspection_documents
-- ==========================================

-- 1. Vérifier les contraintes de la table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inspection_documents'
ORDER BY ordinal_position;

-- 2. Vérifier les foreign keys
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
WHERE tc.table_name = 'inspection_documents'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 3. Vérifier les policies INSERT
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'inspection_documents'
  AND cmd = 'INSERT';

-- 4. Tester un INSERT manuel
-- ⚠️ Remplacez YOUR_USER_ID par votre user_id réel
/*
INSERT INTO inspection_documents (
  inspection_id,
  document_type,
  document_title,
  document_url,
  pages_count,
  user_id
) VALUES (
  NULL,
  'generic',
  'Test document',
  'https://test.com/doc.jpg',
  1,
  'YOUR_USER_ID'
) RETURNING *;
*/

-- 5. Vérifier si RLS bloque les SELECT
SELECT COUNT(*) as documents_visibles
FROM inspection_documents;

-- 6. Désactiver temporairement RLS pour debug (ADMIN SEULEMENT)
-- ALTER TABLE inspection_documents DISABLE ROW LEVEL SECURITY;
-- Puis refaire le test et réactiver:
-- ALTER TABLE inspection_documents ENABLE ROW LEVEL SECURITY;
