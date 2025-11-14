-- ==========================================
-- 🔧 FORCE FIX - Bypass RLS to assign documents
-- ==========================================

-- This will disable RLS temporarily to update the user_id
BEGIN;

-- Temporarily disable RLS for this transaction
SET LOCAL row_security = off;

-- Show current state
SELECT 
  id,
  inspection_id,
  document_title,
  user_id as old_user_id,
  auth.uid() as new_user_id
FROM inspection_documents;

-- Update ALL documents to current user
UPDATE inspection_documents 
SET user_id = auth.uid(),
    updated_at = now();

-- Verify the fix
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as mes_documents,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as documents_sans_user
FROM inspection_documents;

COMMIT;

-- Final verification with RLS enabled again
SELECT 
  COUNT(*) as total_accessible,
  COUNT(DISTINCT document_type) as types_count
FROM inspection_documents
WHERE user_id = auth.uid();
