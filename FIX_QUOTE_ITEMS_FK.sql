-- ================================================================
-- FIX: Ajouter la foreign key manquante quote_items → quotes
-- 
-- Erreur corrigée :
--   PGRST200: Could not find a relationship between 'quotes' 
--   and 'quote_items' in the schema cache
--
-- Exécuter dans Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Vérifier si la FK existe déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
          AND table_name = 'quote_items' 
          AND constraint_name LIKE '%quote_id%'
    ) THEN
        -- Ajouter la FK si elle n'existe pas
        ALTER TABLE quote_items 
            ADD CONSTRAINT quote_items_quote_id_fkey 
            FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;
        RAISE NOTICE 'FK quote_items_quote_id_fkey créée';
    ELSE
        RAISE NOTICE 'FK déjà existante';
    END IF;
END $$;

-- 2. S'assurer que l'index existe
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- 3. Rafraîchir le cache PostgREST (via NOTIFY)
NOTIFY pgrst, 'reload schema';
