-- Migration: Ajouter client_id aux tables invoices et quotes
-- Date: 2025-10-11
-- Description: Permet de lier les factures et devis à la table clients

-- =====================================================
-- 1. AJOUTER COLONNE client_id À invoices
-- =====================================================

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);

-- Commentaire
COMMENT ON COLUMN invoices.client_id IS 'Référence au client de la table clients (optionnel, permet de lier au CRM)';

-- =====================================================
-- 2. AJOUTER COLONNE client_id À quotes
-- =====================================================

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);

-- Commentaire
COMMENT ON COLUMN quotes.client_id IS 'Référence au client de la table clients (optionnel, permet de lier au CRM)';

-- =====================================================
-- 3. FONCTION POUR SYNCHRONISER LES DONNÉES CLIENT
-- =====================================================

-- Fonction pour mettre à jour automatiquement les champs client à partir de client_id
CREATE OR REPLACE FUNCTION sync_client_data_to_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    -- Récupérer les données du client
    SELECT 
      name,
      email,
      address,
      siret
    INTO 
      NEW.client_name,
      NEW.client_email,
      NEW.client_address,
      NEW.client_siret
    FROM clients
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour invoices
DROP TRIGGER IF EXISTS sync_client_data_invoice ON invoices;
CREATE TRIGGER sync_client_data_invoice
  BEFORE INSERT OR UPDATE OF client_id ON invoices
  FOR EACH ROW
  WHEN (NEW.client_id IS NOT NULL)
  EXECUTE FUNCTION sync_client_data_to_invoice();

-- Fonction pour quotes
CREATE OR REPLACE FUNCTION sync_client_data_to_quote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    -- Récupérer les données du client
    SELECT 
      name,
      email,
      address,
      siret
    INTO 
      NEW.client_name,
      NEW.client_email,
      NEW.client_address,
      NEW.client_siret
    FROM clients
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour quotes
DROP TRIGGER IF EXISTS sync_client_data_quote ON quotes;
CREATE TRIGGER sync_client_data_quote
  BEFORE INSERT OR UPDATE OF client_id ON quotes
  FOR EACH ROW
  WHEN (NEW.client_id IS NOT NULL)
  EXECUTE FUNCTION sync_client_data_to_quote();

-- =====================================================
-- 4. COMMENTAIRES
-- =====================================================

COMMENT ON FUNCTION sync_client_data_to_invoice IS 'Synchronise automatiquement les données client depuis la table clients vers invoices quand client_id est défini';
COMMENT ON FUNCTION sync_client_data_to_quote IS 'Synchronise automatiquement les données client depuis la table clients vers quotes quand client_id est défini';

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
