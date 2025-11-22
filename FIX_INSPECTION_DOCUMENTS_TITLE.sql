-- =====================================================
-- CORRECTION: document_title NOT NULL dans inspection_documents
-- =====================================================

-- Rendre la colonne document_title NULLABLE
ALTER TABLE public.inspection_documents 
  ALTER COLUMN document_title DROP NOT NULL;

-- Mettre une valeur par défaut pour les enregistrements existants NULL
UPDATE public.inspection_documents 
SET document_title = 'Document sans titre'
WHERE document_title IS NULL;

-- Ajouter une valeur par défaut pour les futurs inserts
ALTER TABLE public.inspection_documents 
  ALTER COLUMN document_title SET DEFAULT 'Document';

-- Confirmation
SELECT 
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inspection_documents'
  AND column_name = 'document_title';
