-- =====================================================
-- Migration: Mise à jour structure table invoices
-- Description: Aligner la table invoices avec le modèle Flutter
-- Date: 2025-02-05
-- =====================================================

-- ⚠️ PROBLÈME IDENTIFIÉ:
-- La table invoices attend: client_name, client_email, client_address, etc.
-- Mais l'app Flutter envoie: client_info (JSONB)
-- Et aussi: invoice_date au lieu de issue_date

-- ==================================================
-- 1. AJOUTER LES COLONNES MANQUANTES
-- ==================================================

-- Colonne pour stocker les infos client en JSONB (comme l'app l'envoie)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS client_info JSONB;

-- Colonne pour les missions liées
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

-- Colonne pour les clients référencés
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Colonnes pour le paiement
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Ajouter invoice_date comme alias/colonne alternative
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- ==================================================
-- 2. RENDRE LES COLONNES CLIENT_* OPTIONNELLES
-- ==================================================

-- Retirer NOT NULL des colonnes client séparées (maintenant optionnelles car on a client_info)
ALTER TABLE invoices 
ALTER COLUMN client_name DROP NOT NULL;

ALTER TABLE invoices 
ALTER COLUMN client_email DROP NOT NULL;

-- ==================================================
-- 3. MIGRATION DES DONNÉES EXISTANTES
-- ==================================================

-- Copier issue_date vers invoice_date pour les factures existantes
UPDATE invoices 
SET invoice_date = issue_date 
WHERE invoice_date IS NULL;

-- Migrer les données client existantes vers client_info JSONB
UPDATE invoices 
SET client_info = jsonb_build_object(
  'name', client_name,
  'email', client_email,
  'address', client_address,
  'siret', client_siret
)
WHERE client_info IS NULL 
AND (client_name IS NOT NULL OR client_email IS NOT NULL);

-- ==================================================
-- 4. CRÉER DES INDEX
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_invoices_mission_id ON invoices(mission_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at DESC) WHERE paid_at IS NOT NULL;

-- Index GIN pour recherche dans client_info JSONB
CREATE INDEX IF NOT EXISTS idx_invoices_client_info_gin ON invoices USING GIN (client_info);

-- ==================================================
-- 5. COMMENTAIRES POUR DOCUMENTATION
-- ==================================================

COMMENT ON COLUMN invoices.client_info IS 'Informations client au format JSONB (name, email, phone, address, siret, vat_number, payment_terms, etc.)';
COMMENT ON COLUMN invoices.mission_id IS 'Référence vers la mission de convoyage (optionnel)';
COMMENT ON COLUMN invoices.client_id IS 'Référence vers le client (optionnel)';
COMMENT ON COLUMN invoices.invoice_date IS 'Date de la facture (alias de issue_date)';
COMMENT ON COLUMN invoices.payment_method IS 'Méthode de paiement utilisée (carte, virement, espèces, etc.)';
COMMENT ON COLUMN invoices.paid_at IS 'Date et heure du paiement';

-- ==================================================
-- 6. VÉRIFICATION
-- ==================================================

-- Afficher la structure de la table mise à jour
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- Compter les factures avec client_info
SELECT 
    COUNT(*) as total_invoices,
    COUNT(client_info) as with_client_info,
    COUNT(mission_id) as linked_to_mission
FROM invoices;

-- ==================================================
-- NOTES D'UTILISATION
-- ==================================================

/*
Après cette migration, votre app Flutter peut envoyer:

{
  "user_id": "uuid",
  "invoice_number": "INV-2025-0001",
  "invoice_date": "2025-02-05",
  "due_date": "2025-03-05",
  "status": "draft",
  "subtotal": 100.00,
  "tax_rate": 20.0,
  "tax_amount": 20.00,
  "total": 120.00,
  "notes": "Note optionnelle",
  "client_info": {
    "name": "Nom Client",
    "email": "email@client.com",
    "phone": "0612345678",
    "address": "Adresse complète",
    "siret": "12345678901234",
    "vat_number": "FR12345678901",
    "payment_terms": "Paiement à 30 jours"
  },
  "mission_id": "uuid-optional",
  "client_id": "uuid-optional",
  "payment_method": "carte",
  "paid_at": "2025-02-05T14:30:00Z"
}

Les items vont dans la table invoice_items séparément.
*/
