-- Création de la table pour stocker les documents scannés (compatible Expo mobile + Web + Flutter)
-- Note: Si la table existe déjà avec id UUID, utiliser ALTER TABLE pour ajouter les colonnes manquantes
CREATE TABLE IF NOT EXISTS inspection_documents (
  id BIGSERIAL PRIMARY KEY, -- Ou UUID si déjà créé avec gen_random_uuid()
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  inspection_id BIGINT, -- Nullable: null = document standalone, sinon lié à vehicle_inspections
  document_type TEXT DEFAULT 'generic', -- Type: 'generic', 'contract', 'identity', 'delivery_receipt', 'damage_report', etc.
  document_title TEXT, -- Titre du document (ex: "Scan 25/12/2024")
  document_url TEXT NOT NULL, -- URL publique dans le bucket 'inspection-documents'
  pages_count INTEGER DEFAULT 1, -- Nombre de pages (1 pour scans simples)
  file_size_kb INTEGER, -- Taille en Ko (optionnel)
  extracted_text TEXT, -- Texte OCR extrait (optionnel, pour Flutter)
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Date de scan (pour compatibilité)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_inspection_documents_user_id ON inspection_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_documents_inspection_id ON inspection_documents(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_documents_created_at ON inspection_documents(created_at DESC);

-- Enable RLS
ALTER TABLE inspection_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres documents
CREATE POLICY "Users can view own documents"
ON inspection_documents
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent insérer leurs propres documents
CREATE POLICY "Users can insert own documents"
ON inspection_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres documents
CREATE POLICY "Users can update own documents"
ON inspection_documents
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres documents
CREATE POLICY "Users can delete own documents"
ON inspection_documents
FOR DELETE
USING (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_inspection_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_inspection_documents_updated_at ON inspection_documents;
CREATE TRIGGER update_inspection_documents_updated_at
BEFORE UPDATE ON inspection_documents
FOR EACH ROW
EXECUTE FUNCTION update_inspection_documents_updated_at();
