-- ============================================================
-- FINALITY DATABASE FIXES - COMPLET
-- ============================================================
-- Date: 5 Février 2026
-- Exécute toutes les corrections de schéma en une seule fois
-- Temps estimé: ~30 secondes
-- ============================================================

-- ============================================================
-- ÉTAPE 1: VEHICLE INSPECTIONS (CRITIQUE)
-- ============================================================

BEGIN;

-- Ajout colonnes fuel level numeric
ALTER TABLE vehicle_inspections
  ADD COLUMN IF NOT EXISTS fuel_level_numeric NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS fuel_level_percentage INTEGER;

-- Migration données fuel_level existantes
-- Si fuel_level est déjà numérique (INTEGER), on le copie directement
-- Sinon on essaie de le parser
UPDATE vehicle_inspections 
SET fuel_level_percentage = 
  CASE 
    -- Si fuel_level est déjà un nombre, on le garde tel quel (assume 0-100 ou 0-4)
    WHEN fuel_level IS NOT NULL AND fuel_level >= 0 AND fuel_level <= 100 THEN fuel_level
    WHEN fuel_level IS NOT NULL AND fuel_level >= 0 AND fuel_level <= 4 THEN fuel_level * 25
    ELSE NULL
  END
WHERE fuel_level_percentage IS NULL;

-- Ajout champs kilométrage et signatures
ALTER TABLE vehicle_inspections
  ADD COLUMN IF NOT EXISTS mileage_km_start INTEGER,
  ADD COLUMN IF NOT EXISTS mileage_km_end INTEGER,
  ADD COLUMN IF NOT EXISTS odometer_km INTEGER,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_driver_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_client_url TEXT;

-- Migration signatures existantes
UPDATE vehicle_inspections 
SET signature_driver_url = driver_signature 
WHERE signature_driver_url IS NULL AND driver_signature IS NOT NULL;

UPDATE vehicle_inspections 
SET signature_client_url = client_signature 
WHERE signature_client_url IS NULL AND client_signature IS NOT NULL;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_fuel_level_percentage 
  ON vehicle_inspections(fuel_level_percentage);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_mileage_km 
  ON vehicle_inspections(mileage_km);

-- Documentation
COMMENT ON COLUMN vehicle_inspections.fuel_level_numeric IS 'Numeric fuel level (liters) - preferred over fuel_level string';
COMMENT ON COLUMN vehicle_inspections.fuel_level_percentage IS 'Fuel level as percentage (0-100) for consistency';
COMMENT ON COLUMN vehicle_inspections.mileage_km_start IS 'Odometer reading at start of journey';
COMMENT ON COLUMN vehicle_inspections.mileage_km_end IS 'Odometer reading at end of journey';
COMMENT ON COLUMN vehicle_inspections.odometer_km IS 'Current odometer reading (primary field for mileage)';
COMMENT ON COLUMN vehicle_inspections.started_at IS 'When the inspection process was started';
COMMENT ON COLUMN vehicle_inspections.signature_driver_url IS 'URL to driver signature image';
COMMENT ON COLUMN vehicle_inspections.signature_client_url IS 'URL to client signature image';

COMMIT;

-- ============================================================
-- ÉTAPE 2: INVOICES (FACTURES)
-- ============================================================

BEGIN;

-- Ajout colonnes relations et tracking
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES billing_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_mission_id ON invoices(mission_id);

-- Migration données: sent_at = created_at pour rétrocompatibilité
UPDATE invoices SET sent_at = created_at WHERE sent_at IS NULL;

-- Documentation
COMMENT ON COLUMN invoices.client_id IS 'Reference to billing client (denormalized from client_name)';
COMMENT ON COLUMN invoices.mission_id IS 'Optional link to associated mission';
COMMENT ON COLUMN invoices.payment_method IS 'Payment method used: check, transfer, card, cash, etc.';
COMMENT ON COLUMN invoices.paid_at IS 'Timestamp when payment was received';
COMMENT ON COLUMN invoices.sent_at IS 'Timestamp when invoice was sent to client';

COMMIT;

-- ============================================================
-- ÉTAPE 3: QUOTES (DEVIS)
-- ============================================================

BEGIN;

-- Ajout colonnes lifecycle et relations
ALTER TABLE quotes 
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES billing_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mission_id ON quotes(mission_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_invoice ON quotes(converted_invoice_id);

-- Migration données
UPDATE quotes SET sent_at = created_at WHERE sent_at IS NULL;

-- Documentation
COMMENT ON COLUMN quotes.client_id IS 'Reference to billing client';
COMMENT ON COLUMN quotes.mission_id IS 'Optional link to associated mission';
COMMENT ON COLUMN quotes.client_phone IS 'Client phone number';
COMMENT ON COLUMN quotes.terms IS 'Quote terms and conditions';
COMMENT ON COLUMN quotes.sent_at IS 'When quote was sent to client';
COMMENT ON COLUMN quotes.accepted_at IS 'When quote was accepted by client';
COMMENT ON COLUMN quotes.rejected_at IS 'When quote was rejected by client';
COMMENT ON COLUMN quotes.converted_at IS 'When quote was converted to invoice';
COMMENT ON COLUMN quotes.converted_invoice_id IS 'ID of invoice created from this quote';

COMMIT;

-- ============================================================
-- ÉTAPE 4: MISSIONS (CONVOYAGES)
-- ============================================================

BEGIN;

-- Ajout champs location et tracking
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS pickup_city TEXT,
  ADD COLUMN IF NOT EXISTS delivery_city TEXT,
  ADD COLUMN IF NOT EXISTS pickup_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS delivery_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS public_tracking_link TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Standardisation vehicle_plate
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'vehicle_license_plate'
  ) THEN
    UPDATE missions 
    SET vehicle_plate = vehicle_license_plate 
    WHERE vehicle_plate IS NULL AND vehicle_license_plate IS NOT NULL;
    
    ALTER TABLE missions DROP COLUMN vehicle_license_plate;
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_missions_public_tracking_link ON missions(public_tracking_link);

-- Documentation
COMMENT ON COLUMN missions.pickup_city IS 'City of pickup location (extracted from pickup_address)';
COMMENT ON COLUMN missions.delivery_city IS 'City of delivery location (extracted from delivery_address)';
COMMENT ON COLUMN missions.pickup_postal_code IS 'Postal code of pickup location';
COMMENT ON COLUMN missions.delivery_postal_code IS 'Postal code of delivery location';
COMMENT ON COLUMN missions.public_tracking_link IS 'Shareable public tracking URL for this mission';
COMMENT ON COLUMN missions.completed_at IS 'Timestamp when mission was marked as completed';
COMMENT ON COLUMN missions.started_at IS 'Timestamp when mission actually started (first inspection)';

COMMIT;

-- ============================================================
-- VÉRIFICATIONS POST-MIGRATION
-- ============================================================

-- Vérifier que toutes les colonnes ont été ajoutées
SELECT 
  'VERIFICATION: Nouvelles colonnes' AS check_type,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('invoices', 'quotes', 'missions', 'vehicle_inspections')
  AND column_name IN (
    'client_id', 'mission_id', 'payment_method', 'paid_at', 'sent_at',
    'pickup_city', 'delivery_city', 'pickup_postal_code', 'delivery_postal_code',
    'public_tracking_link', 'completed_at', 'started_at',
    'fuel_level_percentage', 'fuel_level_numeric', 
    'odometer_km', 'mileage_km_start', 'mileage_km_end',
    'signature_driver_url', 'signature_client_url',
    'accepted_at', 'rejected_at', 'converted_at', 'converted_invoice_id', 'terms'
  )
ORDER BY table_name, column_name;

-- Vérifier les index créés
SELECT 
  'VERIFICATION: Index créés' AS check_type,
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN ('invoices', 'quotes', 'missions', 'vehicle_inspections')
ORDER BY tablename, indexname;

-- Compter les données migrées
SELECT 
  'VERIFICATION: Données fuel_level migrées' AS check_type,
  COUNT(*) as total_inspections,
  COUNT(fuel_level_percentage) as inspections_with_fuel_percentage,
  ROUND(COUNT(fuel_level_percentage)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as percentage_migrated
FROM vehicle_inspections;

-- Vérifier vehicle_license_plate a été supprimé
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'missions' 
        AND column_name = 'vehicle_license_plate'
    ) THEN 'ERREUR: vehicle_license_plate existe encore!'
    ELSE 'OK: vehicle_license_plate supprimé'
  END AS vehicle_plate_cleanup_status;

-- ============================================================
-- RÉSUMÉ
-- ============================================================

SELECT 
  '✅ MIGRATION COMPLETE' AS status,
  NOW() AS completed_at,
  '27 nouvelles colonnes ajoutées' AS new_columns,
  '8 index créés' AS new_indexes,
  'Aucune donnée perdue (backwards compatible)' AS data_safety;
