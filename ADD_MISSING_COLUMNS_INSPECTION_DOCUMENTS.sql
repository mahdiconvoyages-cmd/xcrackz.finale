-- ================================================================
-- AJOUT DES COLONNES MANQUANTES POUR COMPATIBILITÉ FLUTTER
-- ================================================================
-- Ce script ajoute les colonnes manquantes si elles n'existent pas
-- Compatible avec une table existante (Expo/Web)
-- ================================================================

-- Ajouter user_id si manquant (pour RLS et filtrage par utilisateur)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspection_documents' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE inspection_documents 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_inspection_documents_user_id 
    ON inspection_documents(user_id);
    
    COMMENT ON COLUMN inspection_documents.user_id IS 'Utilisateur propriétaire du document (pour RLS)';
  END IF;
END $$;

-- Ajouter extracted_text si manquant (pour texte OCR Flutter)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspection_documents' 
    AND column_name = 'extracted_text'
  ) THEN
    ALTER TABLE inspection_documents 
    ADD COLUMN extracted_text TEXT;
    
    COMMENT ON COLUMN inspection_documents.extracted_text IS 'Texte extrait par OCR (Google ML Kit)';
  END IF;
END $$;

-- Ajouter document_title si manquant
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspection_documents' 
    AND column_name = 'document_title'
  ) THEN
    ALTER TABLE inspection_documents 
    ADD COLUMN document_title TEXT;
  END IF;
END $$;

-- Ajouter document_type si manquant
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspection_documents' 
    AND column_name = 'document_type'
  ) THEN
    ALTER TABLE inspection_documents 
    ADD COLUMN document_type TEXT DEFAULT 'generic';
  END IF;
END $$;

-- Ajouter pages_count si manquant
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspection_documents' 
    AND column_name = 'pages_count'
  ) THEN
    ALTER TABLE inspection_documents 
    ADD COLUMN pages_count INTEGER DEFAULT 1;
  END IF;
END $$;

-- Vérification finale
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inspection_documents'
ORDER BY ordinal_position;
