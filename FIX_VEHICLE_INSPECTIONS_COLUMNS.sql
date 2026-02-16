-- ============================================
-- FIX: Ajouter les colonnes manquantes à vehicle_inspections
-- ============================================
-- L'app Flutter insère driver_signature, driver_name, client_name
-- mais ces colonnes n'existent peut-être pas dans la table

-- 1. Ajouter les colonnes manquantes
ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS driver_signature TEXT;
ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS client_signature TEXT;
ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS overall_condition TEXT;
ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS fuel_level INTEGER;
ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS mileage_km INTEGER;

-- 2. Vérifier toutes les colonnes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections'
ORDER BY ordinal_position;
