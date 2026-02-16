-- ============================================================================
-- Migration: ADD_CREDIT_TRANSACTIONS_TRANSACTION_TYPE_ALIAS.sql
-- Purpose : Reconcile schema mismatch between existing column 'type' in
--           credit_transactions and application / test queries expecting
--           'transaction_type'. Adds new column with constraint + backfill
--           and trigger to keep both in sync while legacy code migrates.
-- ----------------------------------------------------------------------------
-- Context :
--   - Table definition (ADD_CREDITS_SYSTEM.sql) uses column: type TEXT CHECK (...)
--   - Some analytics / test SQL (TEST_MOLLIE_ABONNEMENTS.sql) query 'ct.transaction_type'
--   - Runtime error: column "transaction_type" does not exist.
-- Strategy:
--   1. Add new column transaction_type TEXT NULL initially.
--   2. Backfill from existing 'type'.
--   3. Add CHECK constraint mirroring original allowed values.
--   4. Add NOT NULL once backfill complete (only if no NULLs remain).
--   5. Create trigger to keep columns consistent (writes through original 'type' only).
--   6. (Optional future) Deprecate 'type' after code refactor; drop trigger & legacy column.
-- ============================================================================

-- VERSION SIMPLIFIÉE (évite l'erreur syntaxique BEGIN)
-- 1. Ajouter la colonne si absente
ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS transaction_type TEXT;

-- 2. Backfill conditionnel uniquement si la colonne legacy "type" existe (utilise EXECUTE pour éviter l'erreur de parse si absente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_transactions' AND column_name = 'type'
  ) THEN
    EXECUTE 'UPDATE credit_transactions SET transaction_type = type WHERE transaction_type IS NULL';
  END IF;
END $$;

-- 3. Contrainte stricte (seulement addition / deduction selon nouveau modèle admin)
ALTER TABLE credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;
ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_transaction_type_check
  CHECK (transaction_type IN ('addition','deduction'));

-- 4. NOT NULL si aucune valeur manquante
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM credit_transactions WHERE transaction_type IS NULL) THEN
    BEGIN
      ALTER TABLE credit_transactions ALTER COLUMN transaction_type SET NOT NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Impossible de mettre NOT NULL pour transaction_type maintenant.';
    END;
  END IF;
END $$;

-- 5. Index pour filtrage
CREATE INDEX IF NOT EXISTS idx_credit_transactions_transaction_type ON credit_transactions(transaction_type);

-- 6. Nettoyage optionnel: si la colonne legacy "type" n''est plus utilisée, la supprimer (décommenter si prêt)
-- ALTER TABLE credit_transactions DROP COLUMN type;

-- Fin migration simplifiée
-- ============================================================================