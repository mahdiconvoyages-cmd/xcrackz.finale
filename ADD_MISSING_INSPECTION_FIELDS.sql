-- ================================================
-- AJOUT DES CHAMPS D'INSPECTION MANQUANTS
-- Pour synchroniser avec la version web
-- ================================================

-- Ajouter les champs manquants à vehicle_inspections
DO $$ 
BEGIN
    -- Nombre de clés
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vehicle_inspections' AND column_name = 'keys_count') THEN
        ALTER TABLE vehicle_inspections ADD COLUMN keys_count INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Colonne keys_count ajoutée';
    END IF;

    -- Documents du véhicule présents
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vehicle_inspections' AND column_name = 'has_vehicle_documents') THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_vehicle_documents BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_vehicle_documents ajoutée';
    END IF;

    -- Carte grise présente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vehicle_inspections' AND column_name = 'has_registration_card') THEN
        ALTER TABLE vehicle_inspections ADD COLUMN has_registration_card BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne has_registration_card ajoutée';
    END IF;

    -- Réservoir plein
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vehicle_inspections' AND column_name = 'vehicle_is_full') THEN
        ALTER TABLE vehicle_inspections ADD COLUMN vehicle_is_full BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne vehicle_is_full ajoutée';
    END IF;

    -- État du pare-brise
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vehicle_inspections' AND column_name = 'windshield_condition') THEN
        ALTER TABLE vehicle_inspections ADD COLUMN windshield_condition TEXT DEFAULT 'bon'
            CHECK (windshield_condition IN ('bon', 'rayé', 'fissuré', 'cassé'));
        RAISE NOTICE '✅ Colonne windshield_condition ajoutée';
    END IF;

    -- État global du véhicule
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vehicle_inspections' AND column_name = 'condition') THEN
        ALTER TABLE vehicle_inspections ADD COLUMN condition TEXT DEFAULT 'good'
            CHECK (condition IN ('good', 'fair', 'poor'));
        RAISE NOTICE '✅ Colonne condition ajoutée';
    END IF;

    -- Signature conducteur
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vehicle_inspections' AND column_name = 'driver_signature') THEN
        ALTER TABLE vehicle_inspections ADD COLUMN driver_signature TEXT;
        RAISE NOTICE '✅ Colonne driver_signature ajoutée';
    END IF;

    -- Nom du conducteur
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vehicle_inspections' AND column_name = 'driver_name') THEN
        ALTER TABLE vehicle_inspections ADD COLUMN driver_name TEXT;
        RAISE NOTICE '✅ Colonne driver_name ajoutée';
    END IF;

END $$;

-- Vérifier que tout est en place
SELECT 
    'vehicle_inspections' as table_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('keys_count', 'has_vehicle_documents', 'has_registration_card', 
                             'vehicle_is_full', 'windshield_condition', 'condition',
                             'client_signature', 'client_name', 'driver_signature', 'driver_name')
        THEN '✅ Champ inspection OK'
        ELSE ''
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'vehicle_inspections'
AND column_name IN ('keys_count', 'has_vehicle_documents', 'has_registration_card', 
                    'vehicle_is_full', 'windshield_condition', 'condition',
                    'client_signature', 'client_name', 'driver_signature', 'driver_name',
                    'fuel_level', 'mileage_km', 'notes')
ORDER BY column_name;
