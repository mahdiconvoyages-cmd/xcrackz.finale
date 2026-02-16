-- Migration: Ajouter les 6 colonnes manquantes à vehicle_inspections
-- Colonnes déjà présentes: keys_count, has_spare_wheel, driver_signature, driver_name
-- Colonnes à ajouter: has_security_kit, has_inflation_kit, has_fuel_card, is_loaded, has_confided_object, confided_object_description

DO $$ 
BEGIN
    -- 1. has_security_kit
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'has_security_kit'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_security_kit BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_security_kit ajoutée';
    ELSE
        RAISE NOTICE '⚠️  Colonne has_security_kit existe déjà';
    END IF;

    -- 2. has_inflation_kit
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'has_inflation_kit'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_inflation_kit BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_inflation_kit ajoutée';
    ELSE
        RAISE NOTICE '⚠️  Colonne has_inflation_kit existe déjà';
    END IF;

    -- 3. has_fuel_card
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'has_fuel_card'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_fuel_card BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_fuel_card ajoutée';
    ELSE
        RAISE NOTICE '⚠️  Colonne has_fuel_card existe déjà';
    END IF;

    -- 4. is_loaded
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'is_loaded'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN is_loaded BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne is_loaded ajoutée';
    ELSE
        RAISE NOTICE '⚠️  Colonne is_loaded existe déjà';
    END IF;

    -- 5. has_confided_object
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'has_confided_object'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_confided_object BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_confided_object ajoutée';
    ELSE
        RAISE NOTICE '⚠️  Colonne has_confided_object existe déjà';
    END IF;

    -- 6. confided_object_description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'confided_object_description'
    ) THEN
        ALTER TABLE vehicle_inspections ADD COLUMN confided_object_description TEXT;
        RAISE NOTICE '✅ Colonne confided_object_description ajoutée';
    ELSE
        RAISE NOTICE '⚠️  Colonne confided_object_description existe déjà';
    END IF;

    RAISE NOTICE '🎯 Migration terminée: 6 colonnes manquantes ajoutées';
END $$;

-- Vérification finale
SELECT 
    COUNT(*) FILTER (WHERE column_name IN (
        'keys_count', 'has_security_kit', 'has_spare_wheel', 
        'has_inflation_kit', 'has_fuel_card', 'is_loaded', 
        'has_confided_object', 'confided_object_description', 
        'driver_name', 'driver_signature'
    )) as colonnes_presentes,
    'Toutes les 10 colonnes doivent être présentes' as verification
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections';
