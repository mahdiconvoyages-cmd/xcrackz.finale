-- ==========================================
-- 🧹 NETTOYER LES POLICIES INSERT EN DOUBLE
-- ==========================================

-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "Users can insert own inspection documents" ON inspection_documents;

-- Garder seulement la nouvelle (déjà créée)
-- Elle gère correctement les NULL

-- Vérifier qu'il ne reste qu'une seule policy INSERT
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'inspection_documents'
  AND cmd = 'INSERT';

-- Tester l'insertion
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
  'Test standalone',
  'https://test.com/doc.jpg',
  1,
  auth.uid()
) RETURNING *;
