-- ================================================
-- SCRIPT DE SYNCHRONISATION DES TABLES WEB/MOBILE
-- ================================================

-- 1. Vérifier et ajouter les colonnes manquantes dans la table missions
-- ====================================================================

-- Vérifier si vehicle_type existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'missions' 
        AND column_name = 'vehicle_type'
    ) THEN
        ALTER TABLE missions 
        ADD COLUMN vehicle_type TEXT CHECK (vehicle_type IN ('VL', 'VU', 'PL'));
        
        -- Mettre à jour les missions existantes avec une valeur par défaut
        UPDATE missions 
        SET vehicle_type = 'VL' 
        WHERE vehicle_type IS NULL;
        
        RAISE NOTICE 'Colonne vehicle_type ajoutée à missions';
    ELSE
        RAISE NOTICE 'Colonne vehicle_type existe déjà';
    END IF;
END $$;

-- Vérifier si vehicle_vin existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'missions' 
        AND column_name = 'vehicle_vin'
    ) THEN
        ALTER TABLE missions 
        ADD COLUMN vehicle_vin TEXT;
        
        RAISE NOTICE 'Colonne vehicle_vin ajoutée à missions';
    ELSE
        RAISE NOTICE 'Colonne vehicle_vin existe déjà';
    END IF;
END $$;

-- Vérifier si vehicle_image_url existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'missions' 
        AND column_name = 'vehicle_image_url'
    ) THEN
        ALTER TABLE missions 
        ADD COLUMN vehicle_image_url TEXT;
        
        RAISE NOTICE 'Colonne vehicle_image_url ajoutée à missions';
    ELSE
        RAISE NOTICE 'Colonne vehicle_image_url existe déjà';
    END IF;
END $$;

-- 2. Vérifier les colonnes de la table clients
-- ==============================================

-- Vérifier la structure de la table clients
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'clients'
ORDER BY ordinal_position;

-- Si la table clients a company_name, first_name, last_name au lieu de name
-- Créer une colonne name qui combine les données existantes
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clients' 
        AND column_name = 'company_name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clients' 
        AND column_name = 'name'
    ) THEN
        -- Ajouter la colonne name
        ALTER TABLE clients ADD COLUMN name TEXT;
        
        -- Migrer les données
        UPDATE clients 
        SET name = COALESCE(
            NULLIF(company_name, ''), 
            TRIM(CONCAT(first_name, ' ', last_name))
        );
        
        -- Rendre name obligatoire
        ALTER TABLE clients ALTER COLUMN name SET NOT NULL;
        
        RAISE NOTICE 'Colonne name ajoutée et migrée depuis company_name/first_name/last_name';
    ELSE
        RAISE NOTICE 'Structure clients OK ou name existe déjà';
    END IF;
END $$;

-- 3. Vérifier les colonnes de la table vehicle_inspections
-- =========================================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'vehicle_inspections'
ORDER BY ordinal_position;

-- 4. Vérifier les colonnes de la table invoices
-- ==============================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'invoices'
ORDER BY ordinal_position;

-- 5. Vérifier les colonnes de la table quotes
-- ============================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'quotes'
ORDER BY ordinal_position;

-- 6. Rapport final de synchronisation
-- ====================================

SELECT 
    'missions' as table_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('vehicle_brand', 'vehicle_model', 'vehicle_plate', 'vehicle_type', 'vehicle_vin', 'vehicle_image_url') 
        THEN '✅ Colonne véhicule OK'
        ELSE ''
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'missions'
AND column_name LIKE 'vehicle%'

UNION ALL

SELECT 
    'clients' as table_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'name' THEN '✅ Colonne name OK'
        WHEN column_name = 'email' THEN '✅ Colonne email OK'
        WHEN column_name IN ('company_name', 'first_name', 'last_name') THEN '⚠️ Anciennes colonnes (migration recommandée)'
        ELSE ''
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'clients'
AND column_name IN ('name', 'email', 'company_name', 'first_name', 'last_name')

ORDER BY table_name, column_name;
