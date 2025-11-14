-- ==========================================
-- 🧹 NETTOYAGE DES POLICIES EN DOUBLE - inspection_documents
-- À exécuter AVANT UPDATE_INSPECTION_DOCUMENTS_RLS.sql
-- ==========================================

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "Documents - SELECT own or assigned" ON inspection_documents;
DROP POLICY IF EXISTS "Documents - INSERT own or assigned" ON inspection_documents;
DROP POLICY IF EXISTS "Documents - DELETE own or assigned" ON inspection_documents;
DROP POLICY IF EXISTS "Users can view own inspection documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can insert own inspection documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can update own inspection documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can delete own inspection documents" ON inspection_documents;

-- ==========================================
-- ✅ Policies nettoyées
-- ==========================================

-- Vérification
SELECT 
  policyname, 
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'inspection_documents';
