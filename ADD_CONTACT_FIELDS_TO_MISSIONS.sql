-- ================================================
-- MIGRATION: Ajout des champs de contact dans missions
-- But: Permettre l'affichage des contacts dans le rapport public
-- ================================================

-- Ajouter les colonnes de contact si elles n'existent pas
DO $$ 
BEGIN
    -- Contact départ (nom)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'pickup_contact_name'
    ) THEN
        ALTER TABLE missions ADD COLUMN pickup_contact_name TEXT;
    END IF;

    -- Contact départ (téléphone)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'pickup_contact_phone'
    ) THEN
        ALTER TABLE missions ADD COLUMN pickup_contact_phone TEXT;
    END IF;

    -- Contact arrivée (nom)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'delivery_contact_name'
    ) THEN
        ALTER TABLE missions ADD COLUMN delivery_contact_name TEXT;
    END IF;

    -- Contact arrivée (téléphone)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'delivery_contact_phone'
    ) THEN
        ALTER TABLE missions ADD COLUMN delivery_contact_phone TEXT;
    END IF;

    -- Téléphone du convoyeur
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'driver_phone'
    ) THEN
        ALTER TABLE missions ADD COLUMN driver_phone TEXT;
    END IF;

    -- Nom du convoyeur (si pas déjà présent)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'driver_name'
    ) THEN
        ALTER TABLE missions ADD COLUMN driver_name TEXT;
    END IF;
END $$;

-- Synchroniser les données existantes depuis la table contacts (si les colonnes existent)
DO $$
BEGIN
    -- Vérifier si pickup_contact_id existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'pickup_contact_id'
    ) THEN
        UPDATE missions m
        SET 
            pickup_contact_name = c.name,
            pickup_contact_phone = c.phone
        FROM contacts c
        WHERE m.pickup_contact_id = c.id 
          AND m.pickup_contact_name IS NULL;
    END IF;

    -- Vérifier si delivery_contact_id existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'delivery_contact_id'
    ) THEN
        UPDATE missions m
        SET 
            delivery_contact_name = c.name,
            delivery_contact_phone = c.phone
        FROM contacts c
        WHERE m.delivery_contact_id = c.id 
          AND m.delivery_contact_name IS NULL;
    END IF;

    -- Vérifier si driver_id existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'driver_id'
    ) THEN
        UPDATE missions m
        SET 
            driver_name = c.name,
            driver_phone = c.phone
        FROM contacts c
        WHERE m.driver_id = c.id 
          AND m.driver_name IS NULL;
    END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_missions_pickup_contact ON missions(pickup_contact_name);
CREATE INDEX IF NOT EXISTS idx_missions_delivery_contact ON missions(delivery_contact_name);
CREATE INDEX IF NOT EXISTS idx_missions_driver_phone ON missions(driver_phone);

-- Afficher un message de confirmation
DO $$ 
BEGIN
    RAISE NOTICE '✅ Colonnes de contact ajoutées avec succès à la table missions';
    RAISE NOTICE '✅ Index créés pour optimiser les performances';
END $$;
