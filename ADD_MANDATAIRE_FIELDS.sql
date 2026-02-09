-- Ajouter les champs mandataire et amélioration des informations de contact
-- À exécuter dans l'éditeur SQL Supabase

-- Ajouter les champs mandataire
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS mandataire_name TEXT,
ADD COLUMN IF NOT EXISTS mandataire_company TEXT;

-- Vérifier que les champs de contact existent (normalement déjà présents)
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS pickup_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_contact_phone TEXT;

-- Ajouter des commentaires pour la documentation
COMMENT ON COLUMN missions.mandataire_name IS 'Nom du mandataire qui crée la mission';
COMMENT ON COLUMN missions.mandataire_company IS 'Nom de la société qui mandate le transport';
COMMENT ON COLUMN missions.pickup_contact_phone IS 'Numéro de téléphone du contact à l''enlèvement';
COMMENT ON COLUMN missions.delivery_contact_phone IS 'Numéro de téléphone du contact à la livraison';

-- Créer un index pour améliorer les recherches par mandataire
CREATE INDEX IF NOT EXISTS idx_missions_mandataire_company ON missions(mandataire_company);

-- Afficher le résultat
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'missions' 
  AND column_name IN ('mandataire_name', 'mandataire_company', 'pickup_contact_phone', 'delivery_contact_phone')
ORDER BY column_name;
