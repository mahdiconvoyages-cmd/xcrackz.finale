-- Migration pour ajouter le système de pièces jointes
-- Date: 2025-10-11
-- Description: Création de la table attachments et du bucket storage

-- 1. Créer la table attachments
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  category TEXT CHECK (category IN ('invoice', 'quote', 'contract', 'report', 'photo', 'other')),
  related_to TEXT, -- ID du document lié
  related_type TEXT CHECK (related_type IN ('invoice', 'quote', 'mission', 'inspection', 'client')),
  description TEXT,
  public_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_category ON attachments(category);
CREATE INDEX IF NOT EXISTS idx_attachments_related ON attachments(related_to, related_type);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_at ON attachments(uploaded_at DESC);

-- 3. Activer Row Level Security (RLS)
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- 4. Créer les politiques RLS
-- Politique de lecture : un utilisateur peut voir ses propres pièces jointes
CREATE POLICY "Users can view their own attachments"
  ON attachments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique d'insertion : un utilisateur peut ajouter des pièces jointes
CREATE POLICY "Users can insert their own attachments"
  ON attachments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique de suppression : un utilisateur peut supprimer ses propres pièces jointes
CREATE POLICY "Users can delete their own attachments"
  ON attachments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Politique de mise à jour : un utilisateur peut modifier ses propres pièces jointes
CREATE POLICY "Users can update their own attachments"
  ON attachments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Créer une fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Créer le trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_attachments_updated_at ON attachments;
CREATE TRIGGER trigger_update_attachments_updated_at
  BEFORE UPDATE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_attachments_updated_at();

-- 7. Créer une fonction pour calculer l'espace de stockage utilisé par un utilisateur
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid UUID)
RETURNS BIGINT AS $$
DECLARE
  total_size BIGINT;
BEGIN
  SELECT COALESCE(SUM(file_size), 0)
  INTO total_size
  FROM attachments
  WHERE user_id = user_uuid;
  
  RETURN total_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Créer une vue pour les statistiques de stockage
CREATE OR REPLACE VIEW storage_stats AS
SELECT
  user_id,
  COUNT(*) AS total_files,
  SUM(file_size) AS total_size,
  AVG(file_size) AS avg_file_size,
  MAX(file_size) AS max_file_size,
  MIN(uploaded_at) AS first_upload,
  MAX(uploaded_at) AS last_upload
FROM attachments
GROUP BY user_id;

-- 9. Ajouter des commentaires pour la documentation
COMMENT ON TABLE attachments IS 'Table pour stocker les métadonnées des pièces jointes uploadées par les utilisateurs';
COMMENT ON COLUMN attachments.user_id IS 'ID de l''utilisateur propriétaire du fichier';
COMMENT ON COLUMN attachments.file_name IS 'Nom original du fichier';
COMMENT ON COLUMN attachments.file_type IS 'Type MIME du fichier (ex: image/png)';
COMMENT ON COLUMN attachments.file_size IS 'Taille du fichier en octets';
COMMENT ON COLUMN attachments.storage_path IS 'Chemin du fichier dans Supabase Storage';
COMMENT ON COLUMN attachments.category IS 'Catégorie du fichier (invoice, quote, contract, etc.)';
COMMENT ON COLUMN attachments.related_to IS 'ID du document lié (facture, mission, etc.)';
COMMENT ON COLUMN attachments.related_type IS 'Type du document lié';
COMMENT ON COLUMN attachments.description IS 'Description optionnelle du fichier';
COMMENT ON COLUMN attachments.public_url IS 'URL publique du fichier';

-- 10. Instructions pour créer le bucket Storage (à exécuter manuellement dans Supabase Dashboard)
-- Navigation: Storage > Create a new bucket
-- Bucket name: attachments
-- Public: false (les fichiers seront accessibles seulement aux propriétaires)
-- File size limit: 10MB
-- Allowed MIME types: image/*, application/pdf, application/msword, etc.

-- Note: Les politiques RLS pour le Storage bucket doivent être configurées dans le Dashboard:
-- INSERT policy: bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text
-- SELECT policy: bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text
-- UPDATE policy: bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text
-- DELETE policy: bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text

-- 11. Exemple de requête pour récupérer les pièces jointes d'une facture
-- SELECT * FROM attachments WHERE related_to = 'invoice_id' AND related_type = 'invoice';

-- 12. Exemple de requête pour calculer l'espace utilisé
-- SELECT get_user_storage_usage(auth.uid());
