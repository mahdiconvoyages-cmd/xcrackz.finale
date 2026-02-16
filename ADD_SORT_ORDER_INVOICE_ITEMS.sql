-- ================================================
-- AJOUT COLONNE SORT_ORDER POUR INVOICE_ITEMS
-- Permet le tri des lignes de facture
-- ================================================

-- Ajouter la colonne sort_order si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoice_items' AND column_name = 'sort_order') THEN
        ALTER TABLE invoice_items ADD COLUMN sort_order INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Colonne sort_order ajoutée à invoice_items';
        
        -- Mettre à jour l'ordre existant basé sur created_at
        UPDATE invoice_items 
        SET sort_order = subquery.row_num - 1
        FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY created_at) as row_num
            FROM invoice_items
        ) AS subquery
        WHERE invoice_items.id = subquery.id;
        
        RAISE NOTICE '✅ Ordre initial appliqué aux lignes existantes';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne sort_order existe déjà';
    END IF;
END $$;

-- Vérifier
SELECT 
    'invoice_items' as table_name,
    column_name,
    data_type,
    column_default,
    '✅ Colonne présente' as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'invoice_items'
AND column_name = 'sort_order';
