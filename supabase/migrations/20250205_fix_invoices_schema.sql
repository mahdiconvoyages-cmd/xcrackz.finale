-- Fix INVOICES table schema inconsistencies
-- Add missing columns for payment tracking and relationships

BEGIN;

ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES billing_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_mission_id ON invoices(mission_id);

-- Update existing invoices to use sent_at = created_at for backwards compatibility
UPDATE invoices SET sent_at = created_at WHERE sent_at IS NULL;

-- Add documentation
COMMENT ON COLUMN invoices.client_id IS 'Reference to billing client (denormalized from client_name)';
COMMENT ON COLUMN invoices.mission_id IS 'Optional link to associated mission';
COMMENT ON COLUMN invoices.payment_method IS 'Payment method used: check, transfer, card, cash, etc.';
COMMENT ON COLUMN invoices.paid_at IS 'Timestamp when payment was received';
COMMENT ON COLUMN invoices.sent_at IS 'Timestamp when invoice was sent to client';

COMMIT;
