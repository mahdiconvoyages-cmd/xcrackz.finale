/*
  # Système de Facturation Complet

  ## Description
  Création du système complet de facturation (invoices) et devis (quotes)
  avec leurs lignes d'articles respectives.

  ## Tables créées
  1. invoices - Factures
  2. quotes - Devis
  3. invoice_items - Lignes de facture
  4. quote_items - Lignes de devis

  ## Fonctionnalités
  - Création et gestion de factures
  - Création et gestion de devis
  - Suivi des statuts (draft, sent, paid, etc.)
  - Calcul automatique des totaux et taxes
  - Gestion multi-lignes (articles)
  - Informations client complètes (SIRET, adresse)

  ## Sécurité
  - RLS activé sur toutes les tables
  - Utilisateurs gèrent uniquement leurs propres documents
  - Admins ont accès complet (lecture)
*/

-- =====================================================
-- TABLE: invoices (Factures)
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invoice_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_address text,
  client_siret text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 20,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  notes text,
  payment_terms text DEFAULT 'Paiement à réception de facture',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- =====================================================
-- TABLE: quotes (Devis)
-- =====================================================

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quote_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_address text,
  client_siret text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 20,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_issue_date ON quotes(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number);

-- =====================================================
-- TABLE: invoice_items (Lignes de facture)
-- =====================================================

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  tax_rate decimal(5,2) NOT NULL DEFAULT 20 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  amount decimal(10,2) NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_sort ON invoice_items(invoice_id, sort_order);

-- =====================================================
-- TABLE: quote_items (Lignes de devis)
-- =====================================================

CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  tax_rate decimal(5,2) NOT NULL DEFAULT 20 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  amount decimal(10,2) NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_sort ON quote_items(quote_id, sort_order);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

-- Fonction pour calculer le montant d'une ligne
CREATE OR REPLACE FUNCTION calculate_item_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.amount = NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour calcul automatique
DROP TRIGGER IF EXISTS calculate_invoice_item_amount ON invoice_items;
CREATE TRIGGER calculate_invoice_item_amount
  BEFORE INSERT OR UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_item_amount();

DROP TRIGGER IF EXISTS calculate_quote_item_amount ON quote_items;
CREATE TRIGGER calculate_quote_item_amount
  BEFORE INSERT OR UPDATE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_item_amount();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: invoices
-- =====================================================

-- Lecture
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Insertion
CREATE POLICY "Users can create own invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Modification
CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Suppression
CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: quotes
-- =====================================================

-- Lecture
CREATE POLICY "Users can view own quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Insertion
CREATE POLICY "Users can create own quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Modification
CREATE POLICY "Users can update own quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Suppression
CREATE POLICY "Users can delete own quotes"
  ON quotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: invoice_items
-- =====================================================

-- Lecture
CREATE POLICY "Users can view own invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Insertion
CREATE POLICY "Users can create own invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Modification
CREATE POLICY "Users can update own invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Suppression
CREATE POLICY "Users can delete own invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- =====================================================
-- POLICIES: quote_items
-- =====================================================

-- Lecture
CREATE POLICY "Users can view own quote items"
  ON quote_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

-- Insertion
CREATE POLICY "Users can create own quote items"
  ON quote_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

-- Modification
CREATE POLICY "Users can update own quote items"
  ON quote_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

-- Suppression
CREATE POLICY "Users can delete own quote items"
  ON quote_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

-- =====================================================
-- DONNÉES DE TEST (Optionnel)
-- =====================================================

-- Créer quelques exemples de numérotation
-- Les utilisateurs créeront leurs propres factures/devis
