-- ==========================================
-- 🔍 VÉRIFIER LES POLICIES INSERT QUI BLOQUENT
-- ==========================================

-- 1. Voir toutes les policies INSERT
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'inspection_documents'
  AND cmd = 'INSERT';

-- 2. Désactiver temporairement RLS pour tester
-- ALTER TABLE inspection_documents DISABLE ROW LEVEL SECURITY;

-- 3. Tester INSERT direct
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
  'Test standalone document',
  'https://test.com/doc.jpg',
  1,
  auth.uid()
) RETURNING *;

-- 4. Réactiver RLS après test
-- ALTER TABLE inspection_documents ENABLE ROW LEVEL SECURITY;
