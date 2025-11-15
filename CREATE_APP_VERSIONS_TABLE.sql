-- Créer la table pour stocker les versions APK de l'application mobile
-- Cette table permet à l'admin d'uploader et gérer les versions de l'app

-- Créer la table app_versions
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name TEXT NOT NULL UNIQUE, -- Ex: "1.0.0", "1.0.1"
  version_code INTEGER NOT NULL, -- Ex: 1, 2, 3 (numéro incrémental)
  apk_url TEXT NOT NULL, -- URL du fichier APK dans Supabase Storage
  file_size BIGINT NOT NULL, -- Taille du fichier en bytes
  release_notes TEXT, -- Notes de version / changelog
  is_mandatory BOOLEAN DEFAULT false, -- Force la mise à jour ?
  is_active BOOLEAN DEFAULT true, -- Cette version est-elle disponible ?
  min_supported_version INTEGER, -- Version minimale compatible
  uploaded_by UUID REFERENCES auth.users(id), -- Admin qui a uploadé
  download_count INTEGER DEFAULT 0, -- Nombre de téléchargements
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_app_versions_version_code 
ON app_versions(version_code DESC);

CREATE INDEX IF NOT EXISTS idx_app_versions_is_active 
ON app_versions(is_active);

CREATE INDEX IF NOT EXISTS idx_app_versions_created_at 
ON app_versions(created_at DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_app_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS app_versions_updated_at ON app_versions;
CREATE TRIGGER app_versions_updated_at
  BEFORE UPDATE ON app_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_app_versions_updated_at();

-- RLS Policies
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut lire les versions actives (pour l'app mobile)
CREATE POLICY "Anyone can read active versions"
ON app_versions
FOR SELECT
USING (is_active = true);

-- Policy: Seuls les admins peuvent créer/modifier
CREATE POLICY "Admins can manage versions"
ON app_versions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Créer le bucket pour les APK dans Storage (si n'existe pas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('apk-files', 'apk-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy Storage: Admins peuvent uploader
CREATE POLICY "Admins can upload APK"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'apk-files' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Policy Storage: Tout le monde peut télécharger
CREATE POLICY "Anyone can download APK"
ON storage.objects
FOR SELECT
USING (bucket_id = 'apk-files');

-- Policy Storage: Admins peuvent supprimer
CREATE POLICY "Admins can delete APK"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'apk-files' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Vérifier la structure créée
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'app_versions'
ORDER BY ordinal_position;
