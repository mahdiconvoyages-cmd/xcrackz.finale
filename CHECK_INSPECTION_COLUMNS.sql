-- Script de vérification: Colonnes vehicle_inspections
-- Exécuter dans Supabase SQL Editor pour voir quelles colonnes existent

-- 1. Lister TOUTES les colonnes de la table vehicle_inspections
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'vehicle_inspections'
ORDER BY ordinal_position;

-- 2. Vérifier spécifiquement les colonnes de la checklist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'keys_count') 
        THEN '✅ keys_count existe' 
        ELSE '❌ keys_count MANQUANT' 
    END as keys_count_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'has_security_kit') 
        THEN '✅ has_security_kit existe' 
        ELSE '❌ has_security_kit MANQUANT' 
    END as has_security_kit_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'has_spare_wheel') 
        THEN '✅ has_spare_wheel existe' 
        ELSE '❌ has_spare_wheel MANQUANT' 
    END as has_spare_wheel_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'has_inflation_kit') 
        THEN '✅ has_inflation_kit existe' 
        ELSE '❌ has_inflation_kit MANQUANT' 
    END as has_inflation_kit_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'has_fuel_card') 
        THEN '✅ has_fuel_card existe' 
        ELSE '❌ has_fuel_card MANQUANT' 
    END as has_fuel_card_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'is_loaded') 
        THEN '✅ is_loaded existe' 
        ELSE '❌ is_loaded MANQUANT' 
    END as is_loaded_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'has_confided_object') 
        THEN '✅ has_confided_object existe' 
        ELSE '❌ has_confided_object MANQUANT' 
    END as has_confided_object_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'confided_object_description') 
        THEN '✅ confided_object_description existe' 
        ELSE '❌ confided_object_description MANQUANT' 
    END as confided_object_description_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'driver_name') 
        THEN '✅ driver_name existe' 
        ELSE '❌ driver_name MANQUANT' 
    END as driver_name_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'driver_signature') 
        THEN '✅ driver_signature existe' 
        ELSE '❌ driver_signature MANQUANT' 
    END as driver_signature_status;

-- 3. Compter le nombre de colonnes qui existent
SELECT 
    COUNT(*) FILTER (WHERE column_name IN (
        'keys_count', 'has_security_kit', 'has_spare_wheel', 
        'has_inflation_kit', 'has_fuel_card', 'is_loaded', 
        'has_confided_object', 'confided_object_description', 
        'driver_name', 'driver_signature'
    )) as colonnes_existantes,
    10 as colonnes_requises,
    10 - COUNT(*) FILTER (WHERE column_name IN (
        'keys_count', 'has_security_kit', 'has_spare_wheel', 
        'has_inflation_kit', 'has_fuel_card', 'is_loaded', 
        'has_confided_object', 'confided_object_description', 
        'driver_name', 'driver_signature'
    )) as colonnes_manquantes
FROM information_schema.columns
WHERE table_name = 'vehicle_inspections';
