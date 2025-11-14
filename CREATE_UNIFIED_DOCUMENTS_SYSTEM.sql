-- ==========================================
-- 📱💻 SYSTÈME DE DOCUMENTS UNIFIÉS
-- Synchronisation automatique Web & Mobile
-- ==========================================

-- 1. Créer le bucket de stockage (si nécessaire)
-- À exécuter manuellement dans Supabase Dashboard > Storage:
-- Bucket name: scanned-documents
-- Public: true
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, application/pdf

-- 2. Table des documents unifiés
CREATE TABLE IF NOT EXISTS unified_scanned_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    filter_type TEXT NOT NULL CHECK (filter_type IN ('bw', 'grayscale', 'color')),
    document_type TEXT CHECK (document_type IN ('registration', 'insurance', 'receipt', 'generic')),
    inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
    platform TEXT NOT NULL CHECK (platform IN ('web', 'mobile')),
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index pour performances
CREATE INDEX IF NOT EXISTS idx_unified_docs_user_id ON unified_scanned_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_docs_inspection_id ON unified_scanned_documents(inspection_id);
CREATE INDEX IF NOT EXISTS idx_unified_docs_created_at ON unified_scanned_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_docs_platform ON unified_scanned_documents(platform);
CREATE INDEX IF NOT EXISTS idx_unified_docs_type ON unified_scanned_documents(document_type);

-- 4. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_unified_docs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_unified_docs_updated_at
    BEFORE UPDATE ON unified_scanned_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_unified_docs_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE unified_scanned_documents ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres documents
CREATE POLICY "Users can view own documents"
    ON unified_scanned_documents
    FOR SELECT
    USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leurs propres documents
CREATE POLICY "Users can create own documents"
    ON unified_scanned_documents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent modifier leurs propres documents
CREATE POLICY "Users can update own documents"
    ON unified_scanned_documents
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent supprimer leurs propres documents
CREATE POLICY "Users can delete own documents"
    ON unified_scanned_documents
    FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Fonction pour nettoyer les anciens documents (optionnel)
CREATE OR REPLACE FUNCTION cleanup_old_documents()
RETURNS void AS $$
BEGIN
    -- Supprimer les documents de plus de 1 an
    DELETE FROM unified_scanned_documents
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- 7. Vues utiles
CREATE OR REPLACE VIEW user_document_stats AS
SELECT 
    user_id,
    COUNT(*) as total_documents,
    COUNT(DISTINCT inspection_id) as linked_inspections,
    SUM(file_size) as total_storage_bytes,
    COUNT(*) FILTER (WHERE platform = 'web') as web_documents,
    COUNT(*) FILTER (WHERE platform = 'mobile') as mobile_documents,
    COUNT(*) FILTER (WHERE filter_type = 'bw') as bw_documents,
    COUNT(*) FILTER (WHERE filter_type = 'grayscale') as gray_documents,
    COUNT(*) FILTER (WHERE filter_type = 'color') as color_documents,
    MAX(created_at) as last_scan_date
FROM unified_scanned_documents
GROUP BY user_id;

-- 8. Commentaires pour documentation
COMMENT ON TABLE unified_scanned_documents IS 'Documents scannés synchronisés entre web et mobile';
COMMENT ON COLUMN unified_scanned_documents.filter_type IS 'Type de filtre appliqué: bw (noir et blanc), grayscale (niveaux de gris), color (couleur)';
COMMENT ON COLUMN unified_scanned_documents.document_type IS 'Type de document: registration (carte grise), insurance (assurance), receipt (reçu), generic (générique)';
COMMENT ON COLUMN unified_scanned_documents.platform IS 'Plateforme d''origine: web ou mobile';
COMMENT ON COLUMN unified_scanned_documents.inspection_id IS 'ID de l''inspection liée (optionnel)';

-- ==========================================
-- ✅ Migration terminée
-- ==========================================

-- À faire manuellement dans Supabase Dashboard:
-- 1. Storage > Create bucket "scanned-documents" (public)
-- 2. Storage > Policies > Allow authenticated users to upload/read/delete
