-- ============================================
-- MIGRATION: Verrouillage + Signatures Inspection
-- ============================================
-- Date: 11 octobre 2025
-- Objectif: Ajouter statut, signatures et verrouillage

-- 1. Ajouter colonnes pour statut et verrouillage
ALTER TABLE inspections 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'locked')),
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- 2. Ajouter colonnes pour signatures
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS driver_signature TEXT,
ADD COLUMN IF NOT EXISTS client_signature TEXT,
ADD COLUMN IF NOT EXISTS driver_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS client_signed_at TIMESTAMP WITH TIME ZONE;

-- 3. Index pour performance
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_mission_status ON inspections(mission_id, status);
CREATE INDEX IF NOT EXISTS idx_inspections_locked_at ON inspections(locked_at) WHERE locked_at IS NOT NULL;

-- 4. Fonction pour verrouiller une inspection
CREATE OR REPLACE FUNCTION lock_inspection(inspection_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE inspections
  SET status = 'locked',
      locked_at = NOW()
  WHERE id = inspection_uuid
    AND status = 'draft';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger pour empêcher modification si locked
CREATE OR REPLACE FUNCTION prevent_locked_inspection_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'locked' AND (
    NEW.vehicle_info IS DISTINCT FROM OLD.vehicle_info OR
    NEW.damages IS DISTINCT FROM OLD.damages OR
    NEW.notes IS DISTINCT FROM OLD.notes OR
    NEW.fuel_level IS DISTINCT FROM OLD.fuel_level OR
    NEW.mileage_km IS DISTINCT FROM OLD.mileage_km
  ) THEN
    RAISE EXCEPTION 'Cannot modify a locked inspection';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_locked_changes
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_inspection_changes();

-- 6. Vérifier la structure finale
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'inspections'
  AND column_name IN ('status', 'locked_at', 'driver_signature', 'client_signature', 'driver_signed_at', 'client_signed_at')
ORDER BY ordinal_position;

-- 7. Test
-- Créer une inspection de test
/*
INSERT INTO inspections (mission_id, inspector_id, inspection_type)
VALUES (
  'MISSION_ID_HERE',
  auth.uid(),
  'departure'
) RETURNING id, status, locked_at;

-- Verrouiller l'inspection
SELECT lock_inspection('INSPECTION_ID_HERE');

-- Vérifier le verrouillage
SELECT id, status, locked_at FROM inspections WHERE id = 'INSPECTION_ID_HERE';

-- Essayer de modifier (devrait échouer)
UPDATE inspections 
SET notes = 'Test modification'
WHERE id = 'INSPECTION_ID_HERE';
-- Erreur attendue: "Cannot modify a locked inspection"
*/

COMMIT;
