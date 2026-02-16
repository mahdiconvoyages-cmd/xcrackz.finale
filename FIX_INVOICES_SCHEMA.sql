-- ================================================
-- FIX: Aligner la table invoices avec le modele Flutter
-- Ajouter les colonnes manquantes et fixer les contraintes
-- Safe a executer plusieurs fois (idempotent)
-- ================================================

-- 1. Ajouter les colonnes manquantes

-- mission_id pour lier une facture a une mission
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'mission_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_invoices_mission_id ON public.invoices(mission_id);
  END IF;
END $$;

-- client_id pour lier a un client
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN client_id UUID;
  END IF;
END $$;

-- invoice_date comme alias de issue_date
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_date'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN invoice_date DATE;
    -- Synchroniser avec issue_date
    UPDATE public.invoices SET invoice_date = issue_date WHERE invoice_date IS NULL;
  END IF;
END $$;

-- paid_at pour la date de paiement
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;
END $$;

-- payment_method
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN payment_method TEXT;
  END IF;
END $$;

-- client_info (JSONB pour infos client supplementaires)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'client_info'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN client_info JSONB;
  END IF;
END $$;

-- 2. Rendre client_name et client_email nullable (pour factures auto depuis missions)
ALTER TABLE public.invoices ALTER COLUMN client_name DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN client_email DROP NOT NULL;

-- 3. Mettre a jour le CHECK constraint status pour inclure 'pending'
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled'));

-- 4. Creer un trigger pour synchroniser invoice_date et issue_date
CREATE OR REPLACE FUNCTION sync_invoice_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_date IS NOT NULL AND NEW.issue_date IS NULL THEN
    NEW.issue_date := NEW.invoice_date;
  ELSIF NEW.issue_date IS NOT NULL AND NEW.invoice_date IS NULL THEN
    NEW.invoice_date := NEW.issue_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_invoice_date_trigger ON public.invoices;
CREATE TRIGGER sync_invoice_date_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION sync_invoice_date();

-- 5. RLS policies pour les nouvelles colonnes (deja couvertes par user_id)
-- Les policies existantes filtrent par user_id, donc pas de changement necessaire

DO $$ BEGIN
  RAISE NOTICE 'Migration invoices terminee avec succes';
END $$;
