-- Migration: Ajout des champs de checklist manquants dans vehicle_inspections
-- Date: 26 novembre 2025
-- Description: Synchronisation avec l'app Flutter pour inspection départ/arrivée

-- 1. Nombre de clés
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'keys_count'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN keys_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Colonne keys_count ajoutée';
    END IF;
END $$;

-- 2. Kit de sécurité
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'has_security_kit'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_security_kit BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_security_kit ajoutée';
    END IF;
END $$;

-- 3. Roue de secours
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'has_spare_wheel'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_spare_wheel BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_spare_wheel ajoutée';
    END IF;
END $$;

-- 4. Kit de gonflage
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'has_inflation_kit'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_inflation_kit BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_inflation_kit ajoutée';
    END IF;
END $$;

-- 5. Carte carburant
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'has_fuel_card'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_fuel_card BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_fuel_card ajoutée';
    END IF;
END $$;

-- 6. Véhicule chargé
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'is_loaded'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN is_loaded BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne is_loaded ajoutée';
    END IF;
END $$;

-- 7. Objet confié (checkbox)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'has_confided_object'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_confided_object BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_confided_object ajoutée';
    END IF;
END $$;

-- 8. Description objet confié
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'confided_object_description'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN confided_object_description TEXT;
        RAISE NOTICE '✅ Colonne confided_object_description ajoutée';
    END IF;
END $$;

-- 9. Nom du convoyeur
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'driver_name'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN driver_name TEXT;
        RAISE NOTICE '✅ Colonne driver_name ajoutée';
    END IF;
END $$;

-- 10. Signature du convoyeur
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'driver_signature'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN driver_signature TEXT;
        RAISE NOTICE '✅ Colonne driver_signature ajoutée';
    END IF;
END $$;

-- Vérification finale
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections'
AND column_name IN (
    'keys_count',
    'has_security_kit',
    'has_spare_wheel',
    'has_inflation_kit',
    'has_fuel_card',
    'is_loaded',
    'has_confided_object',
    'confided_object_description',
    'driver_name',
    'driver_signature'
)
ORDER BY column_name;

-- Message final
DO $$ 
BEGIN
    RAISE NOTICE '🎯 Migration terminée: Tous les champs de checklist ont été ajoutés';
    RAISE NOTICE '📋 Champs ajoutés: keys_count, has_security_kit, has_spare_wheel, has_inflation_kit';
    RAISE NOTICE '📋 Champs ajoutés: has_fuel_card, is_loaded, has_confided_object, confided_object_description';
    RAISE NOTICE '📋 Champs ajoutés: driver_name, driver_signature';
    RAISE NOTICE '✅ Web et Flutter sont maintenant synchronisés';
END $$;
