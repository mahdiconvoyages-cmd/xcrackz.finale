-- ==========================================
-- AJOUT CHAMPS EMAIL POUR ENVOI AUTOMATIQUE
-- ==========================================

-- Ajouter le champ email signataire dans vehicle_inspections
ALTER TABLE vehicle_inspections
ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);

-- Commentaire
COMMENT ON COLUMN vehicle_inspections.client_email IS 'Email du signataire pour envoi automatique du rapport';

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_client_email 
ON vehicle_inspections(client_email);

-- Vérification
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections'
AND column_name = 'client_email';
