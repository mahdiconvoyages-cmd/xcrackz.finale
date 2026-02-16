/*
  # TVA Optionnelle et Mentions Légales

  ## Description
  Ajoute la possibilité de rendre la TVA optionnelle et d'inclure automatiquement
  les mentions légales obligatoires selon la réglementation française.

  ## Modifications
  1. Ajout de colonnes pour la gestion de la TVA (assujetti/non-assujetti)
  2. Ajout de colonnes pour les mentions légales personnalisées
  3. Ajout du régime fiscal (micro-entreprise, franchise TVA, TVA normale)

  ## Colonnes ajoutées
  - vat_liable: boolean - Assujetti à la TVA (true) ou non (false)
  - vat_regime: text - Régime fiscal (normal, franchise, micro)
  - legal_mentions: text - Mentions légales personnalisées
*/

-- =====================================================
-- AJOUTER COLONNES À invoices
-- =====================================================

-- Assujettissement à la TVA
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS vat_liable boolean DEFAULT true;

-- Régime fiscal
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS vat_regime text DEFAULT 'normal' 
  CHECK (vat_regime IN ('normal', 'franchise', 'micro'));

-- Mentions légales personnalisées
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS legal_mentions text;

-- Commentaires
COMMENT ON COLUMN invoices.vat_liable IS 'Indique si l''entreprise est assujettie à la TVA (true = TVA appliquée, false = pas de TVA)';
COMMENT ON COLUMN invoices.vat_regime IS 'Régime fiscal: normal (TVA normale), franchise (franchise en base TVA), micro (micro-entreprise)';
COMMENT ON COLUMN invoices.legal_mentions IS 'Mentions légales obligatoires automatiques ou personnalisées';

-- =====================================================
-- AJOUTER COLONNES À quotes
-- =====================================================

-- Assujettissement à la TVA
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS vat_liable boolean DEFAULT true;

-- Régime fiscal
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS vat_regime text DEFAULT 'normal'
  CHECK (vat_regime IN ('normal', 'franchise', 'micro'));

-- Mentions légales personnalisées
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS legal_mentions text;

-- Commentaires
COMMENT ON COLUMN quotes.vat_liable IS 'Indique si l''entreprise est assujettie à la TVA (true = TVA appliquée, false = pas de TVA)';
COMMENT ON COLUMN quotes.vat_regime IS 'Régime fiscal: normal (TVA normale), franchise (franchise en base TVA), micro (micro-entreprise)';
COMMENT ON COLUMN quotes.legal_mentions IS 'Mentions légales obligatoires automatiques ou personnalisées';

-- =====================================================
-- FONCTION: Calcul automatique TVA selon régime
-- =====================================================

-- Fonction pour calculer la TVA selon le régime
CREATE OR REPLACE FUNCTION calculate_vat()
RETURNS TRIGGER AS $$
BEGIN
  -- Si non assujetti à la TVA ou régime franchise/micro
  IF NEW.vat_liable = false OR NEW.vat_regime IN ('franchise', 'micro') THEN
    NEW.tax_rate := 0;
    NEW.tax_amount := 0;
    NEW.total := NEW.subtotal;
  ELSE
    -- TVA normale (20% par défaut)
    IF NEW.tax_rate IS NULL THEN
      NEW.tax_rate := 20;
    END IF;
    NEW.tax_amount := ROUND((NEW.subtotal * NEW.tax_rate / 100)::numeric, 2);
    NEW.total := NEW.subtotal + NEW.tax_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS: Auto-calcul TVA
-- =====================================================

-- Trigger pour invoices
DROP TRIGGER IF EXISTS auto_calculate_vat_invoice ON invoices;
CREATE TRIGGER auto_calculate_vat_invoice
  BEFORE INSERT OR UPDATE OF subtotal, tax_rate, vat_liable, vat_regime ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION calculate_vat();

-- Trigger pour quotes
DROP TRIGGER IF EXISTS auto_calculate_vat_quote ON quotes;
CREATE TRIGGER auto_calculate_vat_quote
  BEFORE INSERT OR UPDATE OF subtotal, tax_rate, vat_liable, vat_regime ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_vat();

-- =====================================================
-- FONCTION: Générer mentions légales automatiques
-- =====================================================

CREATE OR REPLACE FUNCTION get_legal_mentions(
  p_vat_regime text,
  p_vat_liable boolean
) RETURNS text AS $$
DECLARE
  v_mentions text;
BEGIN
  -- Mentions selon le régime fiscal
  CASE p_vat_regime
    WHEN 'micro' THEN
      v_mentions := E'TVA non applicable - Article 293 B du Code Général des Impôts.\n' ||
                    E'Micro-entrepreneur bénéficiant du régime fiscal de la micro-entreprise.\n' ||
                    E'En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).\n' ||
                    E'Aucun escompte en cas de paiement anticipé.';
    
    WHEN 'franchise' THEN
      v_mentions := E'TVA non applicable - Article 293 B du Code Général des Impôts (franchise en base de TVA).\n' ||
                    E'En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).\n' ||
                    E'Pénalités de retard en cas de paiement tardif : taux BCE + 10 points.\n' ||
                    E'Aucun escompte en cas de paiement anticipé.';
    
    ELSE -- 'normal'
      IF p_vat_liable THEN
        v_mentions := E'TVA applicable selon le taux en vigueur.\n' ||
                      E'En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).\n' ||
                      E'Pénalités de retard en cas de paiement tardif : taux BCE + 10 points.\n' ||
                      E'Aucun escompte en cas de paiement anticipé.\n' ||
                      E'Règlement par virement bancaire ou chèque.';
      ELSE
        v_mentions := E'TVA non applicable - Prestation de service exonérée.\n' ||
                      E'En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).\n' ||
                      E'Aucun escompte en cas de paiement anticipé.';
      END IF;
  END CASE;

  RETURN v_mentions;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: Auto-remplir mentions légales si vide
-- =====================================================

CREATE OR REPLACE FUNCTION auto_fill_legal_mentions()
RETURNS TRIGGER AS $$
BEGIN
  -- Si pas de mentions personnalisées, générer automatiquement
  IF NEW.legal_mentions IS NULL OR NEW.legal_mentions = '' THEN
    NEW.legal_mentions := get_legal_mentions(NEW.vat_regime, NEW.vat_liable);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS: Auto-remplir mentions légales
-- =====================================================

-- Trigger pour invoices
DROP TRIGGER IF EXISTS auto_legal_mentions_invoice ON invoices;
CREATE TRIGGER auto_legal_mentions_invoice
  BEFORE INSERT OR UPDATE OF vat_regime, vat_liable ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_legal_mentions();

-- Trigger pour quotes
DROP TRIGGER IF EXISTS auto_legal_mentions_quote ON quotes;
CREATE TRIGGER auto_legal_mentions_quote
  BEFORE INSERT OR UPDATE OF vat_regime, vat_liable ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_legal_mentions();

-- =====================================================
-- MISE À JOUR DES DONNÉES EXISTANTES
-- =====================================================

-- Mettre à jour les factures existantes (défaut: TVA normale)
UPDATE invoices
SET 
  vat_liable = true,
  vat_regime = 'normal',
  legal_mentions = get_legal_mentions('normal', true)
WHERE vat_liable IS NULL;

-- Mettre à jour les devis existants (défaut: TVA normale)
UPDATE quotes
SET 
  vat_liable = true,
  vat_regime = 'normal',
  legal_mentions = get_legal_mentions('normal', true)
WHERE vat_liable IS NULL;
