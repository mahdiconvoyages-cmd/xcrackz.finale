-- Fix QUOTES table schema inconsistencies
-- Add missing columns for relationships and tracking

BEGIN;

ALTER TABLE quotes 
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES billing_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mission_id ON quotes(mission_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_invoice ON quotes(converted_invoice_id);

-- Update existing quotes: set sent_at = created_at for backwards compatibility
UPDATE quotes SET sent_at = created_at WHERE sent_at IS NULL;

-- Add documentation
COMMENT ON COLUMN quotes.client_id IS 'Reference to billing client';
COMMENT ON COLUMN quotes.mission_id IS 'Optional link to associated mission';
COMMENT ON COLUMN quotes.client_phone IS 'Client phone number';
COMMENT ON COLUMN quotes.terms IS 'Quote terms and conditions';
COMMENT ON COLUMN quotes.sent_at IS 'When quote was sent to client';
COMMENT ON COLUMN quotes.accepted_at IS 'When quote was accepted by client';
COMMENT ON COLUMN quotes.rejected_at IS 'When quote was rejected by client';
COMMENT ON COLUMN quotes.converted_at IS 'When quote was converted to invoice';
COMMENT ON COLUMN quotes.converted_invoice_id IS 'ID of invoice created from this quote';

COMMIT;
