/*
  # Ajout de la table clients

  ## Description
  Cette migration ajoute une table pour gérer les clients de l'utilisateur,
  permettant de sauvegarder et réutiliser les informations client pour les factures et devis.

  ## Tables créées
  ### `clients`
  - Stocke les informations des clients (particuliers et entreprises)
  - Lié à l'utilisateur via user_id
  - Informations INSEE pré-remplies si disponibles
  
  ## Sécurité
  - RLS activé
  - Politiques restrictives par utilisateur
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Informations de base
  name text NOT NULL,
  email text,
  phone text,
  
  -- Informations entreprise
  company_name text,
  siret text,
  siren text,
  
  -- Adresse
  address text,
  postal_code text,
  city text,
  country text DEFAULT 'France',
  
  -- Informations complémentaires
  notes text,
  is_company boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  
  -- Métadonnées
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_siret ON clients(siret);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON clients
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Ajouter une colonne client_id aux factures (quotes table doesn't exist yet)
-- ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
-- ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
-- CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
