# 🧾 Améliorations Page Facturation - Plan Complet

## ❌ Ce qui Manque Actuellement

### 1. **Mentions Légales Obligatoires (France)**

#### Pour les Factures
**Obligatoire selon la loi française :**
- ❌ Numéro SIRET de l'émetteur (votre entreprise)
- ❌ Capital social
- ❌ Forme juridique (SARL, SAS, EURL, etc.)
- ❌ RCS + Ville
- ❌ TVA intracommunautaire
- ❌ Adresse complète de l'émetteur
- ❌ Téléphone de contact
- ❌ Email professionnel
- ❌ Conditions de paiement détaillées
- ❌ Pénalités de retard (taux + montant forfaitaire)
- ❌ Escompte pour paiement anticipé (si applicable)
- ❌ Indemnité forfaitaire de recouvrement (40€)
- ❌ Mention "TVA non applicable, art. 293 B du CGI" (si micro-entrepreneur)
- ❌ Numéro de bon de commande (si applicable)

#### Pour les Auto-Entrepreneurs
- ❌ "Dispensé d'immatriculation au registre du commerce et des sociétés (RCS) et au répertoire des métiers (RM)"
- ❌ "TVA non applicable, article 293 B du Code général des impôts"
- ❌ Assurance professionnelle (nom, adresse, couverture géographique)

### 2. **Options TVA**
- ❌ Choix TVA applicable / non applicable
- ❌ Multiples taux de TVA (20%, 10%, 5.5%, 2.1%)
- ❌ Calcul automatique selon le type de prestation
- ❌ Exonération de TVA (export, etc.)
- ❌ Auto-liquidation de TVA (prestations internationales)

### 3. **Fonctionnalités Professionnelles**

#### Gestion Avancée
- ❌ Numérotation automatique personnalisable (préfixe, année, incrémentation)
- ❌ Dupliquer une facture/devis
- ❌ Transformer devis en facture (1 clic)
- ❌ Factures d'acompte (30%, 50%, solde)
- ❌ Avoirs (remboursements, annulations)
- ❌ Factures récurrentes (abonnements mensuels)
- ❌ Relances automatiques (J+7, J+15, J+30)
- ❌ Multi-devises (EUR, USD, GBP)
- ❌ Remises (%, €, par ligne ou globale)

#### Export & Intégration
- ❌ Export comptable (CSV format FEC)
- ❌ Export Excel
- ❌ Signature électronique
- ❌ Envoi par email automatique
- ❌ Lien de paiement en ligne (Stripe, PayPal)
- ❌ Statut de paiement (payé, partiellement, en retard)
- ❌ Rapprochement bancaire

#### Reporting
- ❌ Tableau de bord CA (mensuel, annuel)
- ❌ TVA collectée / déductible
- ❌ Clients top 10
- ❌ Factures en retard
- ❌ Prévisionnel de trésorerie
- ❌ Export liasse fiscale

### 4. **Interface Utilisateur**

#### Manque Actuel
- ❌ Prévisualisation en temps réel du PDF
- ❌ Templates de facture personnalisables
- ❌ Upload logo entreprise
- ❌ Choix couleurs / police
- ❌ Langue du document (FR, EN)
- ❌ Watermark "BROUILLON" sur les drafts
- ❌ Notes internes (privées, non visibles client)
- ❌ Pièces jointes (conditions générales, RIB)

#### UX
- ❌ Recherche par client / montant / période
- ❌ Filtres avancés (statut, date, montant)
- ❌ Tri par colonne
- ❌ Actions en masse (envoi multiple, export)
- ❌ Raccourcis clavier
- ❌ Mode sombre

### 5. **Conformité & Sécurité**

- ❌ Archivage légal 10 ans
- ❌ Numérotation sans trou (obligatoire)
- ❌ Horodatage certifié
- ❌ Log des modifications
- ❌ Interdiction suppression facture envoyée
- ❌ Copie de sécurité automatique
- ❌ Conformité RGPD (données client)

---

## ✅ Plan d'Amélioration - Phase 1 (CRITIQUE)

### 🔴 Priorité Maximale

#### 1. **Mentions Légales Obligatoires**
Ajouter dans le profil utilisateur :
```typescript
interface CompanyProfile {
  // Existant
  company_name: string;
  siret: string;
  address: string;

  // À AJOUTER
  legal_form: string; // SARL, SAS, EURL, EI, Auto-entrepreneur
  capital_social?: number; // Si société
  rcs_city?: string; // Ville d'immatriculation RCS
  tva_number?: string; // TVA intracommunautaire
  phone: string;
  email: string;

  // TVA
  tva_applicable: boolean; // true/false
  tva_regime: 'normal' | 'franchise' | 'auto-entrepreneur';

  // Paiement
  payment_conditions: string; // "30 jours fin de mois"
  late_penalty_rate: number; // Taux pénalités de retard (ex: 10%)
  recovery_fee: number; // Indemnité forfaitaire (40€)
  discount_early_payment?: string; // Escompte si paiement anticipé

  // Assurance (si obligatoire)
  insurance_name?: string;
  insurance_address?: string;
  insurance_coverage?: string;
}
```

#### 2. **Système de TVA Flexible**
```typescript
interface InvoiceSettings {
  // Global
  default_tva_rate: number; // 20
  tva_enabled: boolean; // true/false

  // Par ligne
  allow_different_rates: boolean; // Permettre différents taux par ligne

  // Taux disponibles
  tva_rates: Array<{
    rate: number;
    label: string;
    description: string;
  }>;
  // Ex: [
  //   { rate: 20, label: "TVA 20%", description: "Taux normal" },
  //   { rate: 10, label: "TVA 10%", description: "Taux réduit" },
  //   { rate: 5.5, label: "TVA 5.5%", description: "Taux super-réduit" },
  //   { rate: 0, label: "TVA 0%", description: "Exonéré" }
  // ]
}

// Sur chaque ligne de facture
interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number; // 20, 10, 5.5, 0
  tva_amount: number; // Calculé
  amount_ht: number; // HT
  amount_ttc: number; // TTC
}

// Totaux facture
interface InvoiceTotal {
  subtotal_ht: number;
  tva_by_rate: Array<{
    rate: number;
    base: number;
    amount: number;
  }>;
  // Ex: [
  //   { rate: 20, base: 1000, amount: 200 },
  //   { rate: 10, base: 500, amount: 50 }
  // ]
  total_tva: number;
  total_ttc: number;
}
```

#### 3. **Mentions sur la Facture PDF**
Ajouter automatiquement en pied de page :
```
=== MENTIONS LÉGALES ===

[Nom Entreprise] - [Forme Juridique]
SIRET : [123 456 789 00000]
Capital social : [10 000€] (si société)
RCS [Ville] [Numéro RCS]
TVA Intracommunautaire : [FR12345678901]

Adresse : [Adresse complète]
Téléphone : [06 12 34 56 78]
Email : [contact@entreprise.fr]

CONDITIONS DE PAIEMENT
Paiement à [30] jours fin de mois
Escompte pour paiement anticipé : [2% à 8 jours] (optionnel)

EN CAS DE RETARD DE PAIEMENT
Pénalités de retard : [10%] par an (3 fois le taux d'intérêt légal)
Indemnité forfaitaire pour frais de recouvrement : 40€

TVA NON APPLICABLE - Article 293 B du CGI (si auto-entrepreneur)

Dispensé d'immatriculation au RCS et au RM (si auto-entrepreneur)

ASSURANCE (si applicable)
Assureur : [Nom]
Police n° : [123456]
Couverture géographique : [France / UE / Monde]
```

---

## ✅ Plan d'Amélioration - Phase 2 (IMPORTANT)

### 🟠 Fonctionnalités Business

#### 1. **Devis → Facture (1 clic)**
```typescript
const convertQuoteToInvoice = async (quoteId: string) => {
  // 1. Récupérer le devis
  const quote = await supabase.from('quotes').select('*').eq('id', quoteId).single();

  // 2. Créer la facture avec mêmes données
  const invoice = {
    ...quote,
    invoice_number: generateInvoiceNumber(),
    status: 'draft',
    issue_date: new Date().toISOString(),
    due_date: calculateDueDate(30), // +30 jours
  };

  // 3. Copier les lignes
  const quoteItems = await supabase.from('quote_items').select('*').eq('quote_id', quoteId);
  const invoiceItems = quoteItems.map(item => ({...item, invoice_id: newInvoiceId}));

  // 4. Marquer devis comme "accepté"
  await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quoteId);
};
```

#### 2. **Numérotation Intelligente**
```typescript
interface NumberingSettings {
  prefix: string; // "F", "FA", "FACT"
  year_format: 'YYYY' | 'YY'; // 2025 ou 25
  separator: string; // "-" ou "_"
  digit_count: number; // 4 → 0001, 5 → 00001
  reset_yearly: boolean; // true = repart à 1 chaque année

  // Ex: FA-2025-0042
}

const generateInvoiceNumber = async (settings: NumberingSettings) => {
  const year = settings.year_format === 'YYYY' ? '2025' : '25';

  // Récupérer le dernier numéro de l'année
  const lastInvoice = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${settings.prefix}${settings.separator}${year}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .single();

  // Incrémenter
  const lastNumber = lastInvoice ? extractNumber(lastInvoice.invoice_number) : 0;
  const nextNumber = String(lastNumber + 1).padStart(settings.digit_count, '0');

  return `${settings.prefix}${settings.separator}${year}${settings.separator}${nextNumber}`;
};
```

#### 3. **Factures d'Acompte**
```typescript
interface DepositInvoice {
  parent_invoice_id: string; // Facture principale
  deposit_type: 'percentage' | 'amount'; // 30% ou 500€
  deposit_value: number;
  is_deposit: boolean; // true
  deposit_number: number; // 1, 2, 3 (acompte 1, 2, 3)
}

// Créer facture d'acompte 30%
const createDepositInvoice = async (mainInvoiceId: string, percentage: number) => {
  const mainInvoice = await getInvoice(mainInvoiceId);

  const depositInvoice = {
    ...mainInvoice,
    invoice_number: `${mainInvoice.invoice_number}-ACOMPTE-1`,
    description: `Acompte ${percentage}% - ${mainInvoice.invoice_number}`,
    subtotal: mainInvoice.subtotal * (percentage / 100),
    total: mainInvoice.total * (percentage / 100),
    is_deposit: true,
    parent_invoice_id: mainInvoiceId,
  };

  return depositInvoice;
};

// Facture de solde automatique
const createBalanceInvoice = async (mainInvoiceId: string) => {
  const deposits = await getDepositInvoices(mainInvoiceId);
  const totalDeposits = deposits.reduce((sum, d) => sum + d.total, 0);

  const balanceInvoice = {
    ...mainInvoice,
    invoice_number: `${mainInvoice.invoice_number}-SOLDE`,
    description: `Solde - ${mainInvoice.invoice_number}`,
    subtotal: mainInvoice.subtotal - totalDepositsHT,
    total: mainInvoice.total - totalDeposits,
    is_balance: true,
  };

  return balanceInvoice;
};
```

#### 4. **Avoirs (Credit Notes)**
```typescript
interface CreditNote {
  original_invoice_id: string;
  credit_note_number: string; // AV-2025-0001
  reason: string; // "Annulation" | "Erreur" | "Remboursement partiel"
  amount: number; // Montant du remboursement
  status: 'draft' | 'sent' | 'applied';
}

const createCreditNote = async (invoiceId: string, reason: string, amount: number) => {
  const invoice = await getInvoice(invoiceId);

  const creditNote = {
    credit_note_number: generateCreditNoteNumber(),
    original_invoice_id: invoiceId,
    original_invoice_number: invoice.invoice_number,
    client_name: invoice.client_name,
    amount: -amount, // Négatif
    reason,
    issue_date: new Date(),
  };

  // Mettre à jour le statut de la facture
  await supabase.from('invoices').update({
    status: 'credited',
    credited_amount: amount
  }).eq('id', invoiceId);

  return creditNote;
};
```

#### 5. **Relances Automatiques**
```typescript
interface PaymentReminder {
  invoice_id: string;
  reminder_type: 'first' | 'second' | 'final'; // Relance 1, 2, 3
  sent_at: Date;
  days_overdue: number;
}

// Planifier relances
const scheduleReminders = async (invoiceId: string) => {
  const invoice = await getInvoice(invoiceId);

  // Relance 1 : J+7 après échéance
  await scheduleEmail(invoice.due_date + 7, 'first_reminder', {
    subject: `Rappel : Facture ${invoice.invoice_number} à régler`,
    template: 'gentle_reminder',
  });

  // Relance 2 : J+15
  await scheduleEmail(invoice.due_date + 15, 'second_reminder', {
    subject: `2ème relance : Facture ${invoice.invoice_number}`,
    template: 'firm_reminder',
  });

  // Relance 3 : J+30 (mise en demeure)
  await scheduleEmail(invoice.due_date + 30, 'final_reminder', {
    subject: `MISE EN DEMEURE : Facture ${invoice.invoice_number}`,
    template: 'formal_notice',
  });
};
```

---

## ✅ Plan d'Amélioration - Phase 3 (OPTIONNEL)

### 🟢 Features Avancées

#### 1. **Templates Personnalisables**
- Upload logo entreprise
- Choix couleurs (header, footer)
- Police personnalisée
- Disposition (classique, moderne, minimaliste)

#### 2. **Multi-devises**
- EUR, USD, GBP, CHF
- Taux de change automatique (API)
- Conversion en temps réel

#### 3. **Paiement en Ligne**
- Intégration Stripe / PayPal
- Lien de paiement sur facture
- Statut "Payé" automatique
- Rapprochement bancaire

#### 4. **Export Comptable**
- Format FEC (Fichier des Écritures Comptables)
- Export vers logiciels comptables
- TVA collectée / déductible
- Liasse fiscale

#### 5. **Statistiques Avancées**
- CA mensuel / annuel
- Top clients
- Factures impayées
- Prévisionnel trésorerie
- Graphiques interactifs

---

## 🗄️ Modifications Base de Données Nécessaires

### Migration : Ajout Champs Obligatoires

```sql
-- Ajouter colonnes manquantes à profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legal_form text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS capital_social decimal(12,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rcs_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tva_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tva_applicable boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tva_regime text DEFAULT 'normal';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_conditions text DEFAULT '30 jours fin de mois';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS late_penalty_rate decimal(5,2) DEFAULT 10;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_fee decimal(8,2) DEFAULT 40;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discount_early_payment text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_coverage text;

-- Ajouter colonnes à invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_deposit boolean DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS parent_invoice_id uuid REFERENCES invoices(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deposit_percentage decimal(5,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credited_amount decimal(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_count integer DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

-- Table avoirs
CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  credit_note_number text UNIQUE NOT NULL,
  original_invoice_id uuid REFERENCES invoices(id) NOT NULL,
  amount decimal(10,2) NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Table relances
CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  reminder_type text NOT NULL,
  sent_at timestamptz NOT NULL,
  days_overdue integer NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

---

## 📋 Checklist Implémentation

### Phase 1 (Obligatoire Légal)
- [ ] Formulaire profil entreprise complet
- [ ] Calcul TVA flexible (0%, 5.5%, 10%, 20%)
- [ ] Toggle TVA applicable/non applicable
- [ ] Mentions légales automatiques sur PDF
- [ ] Pénalités de retard sur facture
- [ ] Indemnité forfaitaire 40€
- [ ] Numérotation sans trou (obligatoire)
- [ ] Interdiction suppression facture envoyée

### Phase 2 (Business)
- [ ] Devis → Facture (1 clic)
- [ ] Dupliquer facture
- [ ] Factures d'acompte
- [ ] Avoirs (credit notes)
- [ ] Relances automatiques
- [ ] Remises (%, €)
- [ ] Multi-taux TVA par ligne

### Phase 3 (Avancé)
- [ ] Templates personnalisables
- [ ] Upload logo
- [ ] Paiement en ligne (Stripe)
- [ ] Export comptable (FEC)
- [ ] Multi-devises
- [ ] Dashboard CA
- [ ] Prévisionnel trésorerie

---

## 🎯 Priorisation Recommandée

### Semaine 1 (CRITIQUE)
1. ✅ Profil entreprise complet
2. ✅ Toggle TVA + taux multiples
3. ✅ Mentions légales PDF

### Semaine 2 (IMPORTANT)
4. ✅ Devis → Facture
5. ✅ Dupliquer
6. ✅ Remises

### Semaine 3 (BUSINESS)
7. ✅ Factures d'acompte
8. ✅ Avoirs
9. ✅ Relances

### Semaine 4 (POLISH)
10. ✅ Templates
11. ✅ Dashboard CA
12. ✅ Export Excel

---

**Estimation totale : 4 semaines de développement**

**Résultat : Page facturation professionnelle conforme à la législation française et competitive avec les leaders du marché (Freebe, Facture.net, Henrri) ! 🚀**
