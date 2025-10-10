# 🔍 Analyse des Migrations - Tables Manquantes

## ❌ Tables Utilisées dans le Code MAIS Absentes des Migrations

### 1. **Système de Facturation**
**Tables manquantes :**
- `invoices` ✅ (utilisée dans Dashboard, Billing)
- `quotes` ✅ (utilisée dans Billing)
- `invoice_items` ✅ (utilisée dans Billing)
- `quote_items` ✅ (utilisée dans Billing)

**Impact :**
- ❌ Page Billing ne fonctionne pas
- ❌ Dashboard ne charge pas les factures
- ❌ Impossible de créer des factures/devis

**Priorité :** 🔴 CRITIQUE

### 2. **Storage Buckets**
**Buckets utilisés mais non définis :**
- `vehicle-images` ✅ (VehicleImageUpload.tsx)
- `inspection-photos` ✅ (PhotoUpload, InspectionDeparture, InspectionArrival)

**Impact :**
- ❌ Upload d'images véhicules échoue
- ❌ Photos d'inspection ne s'uploadent pas

**Priorité :** 🔴 CRITIQUE

### 3. **Système de Calendrier**
**Tables manquantes :**
- `calendar_event_participants` (créée dans migration mais pas utilisée actuellement)

**Impact :**
- ⚠️ Mineur (fonctionnalité non implémentée)

**Priorité :** 🟡 FAIBLE

## ✅ Tables Créées dans les Migrations MAIS Non Utilisées

Ces tables existent mais ne sont pas utilisées dans le code actuel :

1. `covoiturage_*` (anciennes tables, remplacées par `carpooling_*`)
2. `documents` (pas utilisée)
3. `driver_availability` (pas utilisée)
4. `driver_mission_history` (pas utilisée)
5. `marketplace_listings` (pas utilisée)
6. `mission_inspections` (remplacée par `vehicle_inspections`)
7. `mission_public_links` (pas utilisée)
8. `mission_tracking` (remplacée par `gps_tracking_sessions`)
9. `mission_tracking_positions` (remplacée par `gps_location_points`)
10. `mission_tracking_sessions` (ancienne, remplacée)
11. `navigation_alerts` (créée mais pas utilisée)
12. `notifications` (créée mais pas utilisée)
13. `reports` (créée mais pas utilisée)
14. `shop_items` (remplacée par `credits_packages`)
15. `subscription_benefits` (créée mais pas utilisée)
16. `alert_votes` (créée mais pas utilisée)
17. `credit_transactions` (remplacée par `transactions`)
18. `credit_usage_log` (pas utilisée)
19. `data_access_logs` (GDPR, à implémenter)
20. `inspection_defects` (pas utilisée)
21. `inspection_items` (pas utilisée)

**Note :** Ces tables peuvent être supprimées ou implémentées selon les besoins.

## 🔧 Actions Requises

### Migration Prioritaire #1 : Système de Facturation

```sql
-- Créer les tables invoices et quotes
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invoice_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_address text,
  client_siret text,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 20,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  notes text,
  payment_terms text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quote_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_address text,
  client_siret text,
  issue_date date NOT NULL,
  valid_until date NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 20,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 20,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 20,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own quotes"
  ON quotes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own invoice items"
  ON invoice_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own quote items"
  ON quote_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );
```

### Migration Prioritaire #2 : Storage Buckets

**Via Supabase Dashboard :**
1. Aller dans Storage
2. Créer bucket `vehicle-images`
   - Public: true
   - File size limit: 5MB
   - Allowed mime types: image/*
3. Créer bucket `inspection-photos`
   - Public: true
   - File size limit: 10MB
   - Allowed mime types: image/*

**Via SQL (policies) :**
```sql
-- Policies pour vehicle-images
CREATE POLICY "Users can upload vehicle images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read vehicle images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vehicle-images');

CREATE POLICY "Users can delete own vehicle images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policies pour inspection-photos
CREATE POLICY "Users can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY "Users can read inspection photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'inspection-photos');
```

## 📊 Statistiques

### Tables dans Migrations : 54
### Tables Utilisées dans Code : 33
### Tables Manquantes : 4 (Billing)
### Storage Buckets Manquants : 2

## 🎯 Priorités

1. 🔴 **URGENT** : Créer migration pour billing (invoices, quotes, items)
2. 🔴 **URGENT** : Configurer storage buckets (vehicle-images, inspection-photos)
3. 🟡 **Moyen** : Nettoyer tables non utilisées (optionnel)
4. 🟢 **Faible** : Implémenter notifications, reports, etc.

## ✅ Ce qui Fonctionne Déjà

- ✅ Système d'authentification (profiles)
- ✅ Missions et assignments
- ✅ Contacts et clients
- ✅ Inspections véhicules
- ✅ GPS tracking
- ✅ Covoiturage (carpooling)
- ✅ Crédits et packages
- ✅ Abonnements (subscriptions)
- ✅ Support chat
- ✅ Calendrier (calendar_events)
- ✅ GDPR (deletion_requests, user_consents)
- ✅ Sécurité (account_creation_attempts, suspicious_accounts)

## 🚨 Impact sur l'Application

### Sans les migrations manquantes :

**Page Billing :**
- ❌ Crash au chargement
- ❌ Impossible de créer factures/devis
- ❌ Erreur Supabase "relation does not exist"

**Upload Images :**
- ❌ Erreur 400 Bad Request (bucket inexistant)
- ❌ Photos véhicules non sauvegardées
- ❌ Photos inspection perdues

**Dashboard :**
- ⚠️ Section factures vide (erreur silencieuse)
- ✅ Reste fonctionnel

## 🔄 Ordre d'Application

1. **Créer migration billing** : `20251010_create_billing_system.sql`
2. **Créer storage buckets** : Via Dashboard ou CLI
3. **Tester** : Billing page + Upload images
4. **Optionnel** : Nettoyer tables non utilisées

---

**Conclusion :** 4 tables critiques manquantes + 2 buckets storage à créer pour avoir un système 100% fonctionnel.
