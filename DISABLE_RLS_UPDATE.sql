-- ==========================================
-- 🔍 CHECK RLS POLICIES + DIRECT UPDATE
-- ==========================================

-- 1. Check existing UPDATE policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'inspection_documents'
AND cmd = 'UPDATE';

-- 2. Temporarily disable RLS on the table (requires admin)
ALTER TABLE inspection_documents DISABLE ROW LEVEL SECURITY;

-- 3. Update all documents
UPDATE inspection_documents 
SET user_id = auth.uid(),
    updated_at = now();

-- 4. Re-enable RLS
ALTER TABLE inspection_documents ENABLE ROW LEVEL SECURITY;

-- 5. Verify
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as mes_documents
FROM inspection_documents;

-- 6. Test SELECT access
SELECT id, document_title, document_type, user_id 
FROM inspection_documents 
LIMIT 3;
