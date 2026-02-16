-- ==========================================
-- 🔧 RENDRE inspection_id NULLABLE
-- ==========================================
-- Pour permettre les documents standalone (scans sans inspection)

-- 1. Vérifier la contrainte actuelle
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inspection_documents'
  AND column_name = 'inspection_id';

-- 2. Modifier la colonne pour accepter NULL
ALTER TABLE inspection_documents 
ALTER COLUMN inspection_id DROP NOT NULL;

-- 3. Vérifier le changement
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inspection_documents'
  AND column_name = 'inspection_id';

-- 4. Tester un INSERT avec NULL
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
  'Test standalone document',
  'https://test.com/doc.jpg',
  1,
  auth.uid()
) RETURNING *;
*/
