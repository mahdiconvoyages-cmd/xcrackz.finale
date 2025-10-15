-- Migration: Système de Devis (Quotes)
-- Description: Permet de créer, gérer et suivre les devis avec calcul automatique via OpenRouteService
-- Date: 15 Octobre 2025

-- Table: quotes
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  pricing_grid_id UUID REFERENCES pricing_grids(id) ON DELETE SET NULL,
  
  -- Dates
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_days INTEGER DEFAULT 30,
  valid_until DATE GENERATED ALWAYS AS (quote_date + validity_days * INTERVAL '1 day') STORED,
  
  -- Trajets (stockés en JSON)
  items JSONB NOT NULL DEFAULT '[]',
  -- Structure d'un item:
  -- {
  --   id: string,
  --   pickup_address: string,
  --   pickup_lat: number,
  --   pickup_lng: number,
  --   delivery_address: string,
  --   delivery_lat: number,
  --   delivery_lng: number,
  --   vehicle_type: 'light' | 'utility' | 'heavy',
  --   distance: number (km),
  --   duration: number (secondes),
  --   price_ht: number,
  --   price_ttc: number,
  --   notes: string
  -- }
  
  -- Totaux
  total_ht DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_ttc DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_distance DECIMAL(10, 2) DEFAULT 0,
  
  -- Notes et conditions
  additional_notes TEXT,
  terms_and_conditions TEXT,
  
  -- Statut du devis
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  
  -- Dates de suivi
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Conversion en mission
  -- Note: Décommentez la ligne suivante si vous avez une table 'missions'
  -- converted_to_mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  converted_to_mission_id UUID,
  converted_at TIMESTAMPTZ,
  
  -- Signature électronique (optionnel)
  client_signature TEXT, -- Base64 de l'image de signature
  signed_at TIMESTAMPTZ,
  
  -- PDF généré
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_pricing_grid_id ON quotes(pricing_grid_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_date ON quotes(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_items_gin ON quotes USING GIN (items);

-- Note: Index full-text sur adresses non possible avec sous-requête
-- Utilisez plutôt des recherches directes sur le JSONB avec les opérateurs @>, @@ etc.

-- RLS Policies
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT (users can view own quotes)
DROP POLICY IF EXISTS "Users can view own quotes" ON quotes;
CREATE POLICY "Users can view own quotes"
  ON quotes FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: INSERT (users can create own quotes)
DROP POLICY IF EXISTS "Users can create own quotes" ON quotes;
CREATE POLICY "Users can create own quotes"
  ON quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: UPDATE (users can update own quotes)
DROP POLICY IF EXISTS "Users can update own quotes" ON quotes;
CREATE POLICY "Users can update own quotes"
  ON quotes FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: DELETE (users can delete own draft quotes)
DROP POLICY IF EXISTS "Users can delete own draft quotes" ON quotes;
CREATE POLICY "Users can delete own draft quotes"
  ON quotes FOR DELETE
  USING (auth.uid() = user_id AND status = 'draft');

-- Triggers

-- 1. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotes_updated_at ON quotes;
CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();

-- 2. Auto-update sent_at quand status devient 'sent'
CREATE OR REPLACE FUNCTION update_quote_sent_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' AND NEW.sent_at IS NULL THEN
    NEW.sent_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_sent_at ON quotes;
CREATE TRIGGER quote_sent_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_sent_at();

-- 3. Auto-update accepted_at quand status devient 'accepted'
CREATE OR REPLACE FUNCTION update_quote_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_accepted_at ON quotes;
CREATE TRIGGER quote_accepted_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_accepted_at();

-- 4. Auto-update rejected_at quand status devient 'rejected'
CREATE OR REPLACE FUNCTION update_quote_rejected_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' AND NEW.rejected_at IS NULL THEN
    NEW.rejected_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_rejected_at ON quotes;
CREATE TRIGGER quote_rejected_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_rejected_at();

-- 5. Auto-update converted_at quand converted_to_mission_id est défini
CREATE OR REPLACE FUNCTION update_quote_converted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.converted_to_mission_id IS NOT NULL AND OLD.converted_to_mission_id IS NULL AND NEW.converted_at IS NULL THEN
    NEW.converted_at = NOW();
    NEW.status = 'converted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_converted_at ON quotes;
CREATE TRIGGER quote_converted_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_converted_at();

-- 6. Auto-calculer total_distance depuis items JSON
CREATE OR REPLACE FUNCTION calculate_quote_total_distance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer la distance totale depuis les items JSON
  SELECT COALESCE(SUM((item->>'distance')::DECIMAL), 0)
  INTO NEW.total_distance
  FROM jsonb_array_elements(NEW.items) AS item;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_calculate_distance ON quotes;
CREATE TRIGGER quote_calculate_distance
  BEFORE INSERT OR UPDATE OF items ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_total_distance();

-- 7. Marquer comme expiré automatiquement (fonction à appeler via cron ou manuellement)
CREATE OR REPLACE FUNCTION expire_old_quotes()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE quotes
  SET status = 'expired'
  WHERE status IN ('draft', 'sent')
    AND valid_until < CURRENT_DATE;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON TABLE quotes IS 'Devis avec calcul automatique de distance via OpenRouteService et tarification via pricing_grids';
COMMENT ON COLUMN quotes.quote_number IS 'Numéro unique du devis (ex: DEV-202510-0001)';
COMMENT ON COLUMN quotes.items IS 'Trajets en JSON avec adresses, coordonnées GPS, distances, durées et prix';
COMMENT ON COLUMN quotes.total_distance IS 'Distance totale calculée automatiquement depuis items';
COMMENT ON COLUMN quotes.valid_until IS 'Date limite de validité calculée automatiquement (quote_date + validity_days)';
COMMENT ON COLUMN quotes.status IS 'draft: brouillon, sent: envoyé au client, accepted: accepté, rejected: refusé, expired: expiré, converted: converti en mission';
COMMENT ON COLUMN quotes.converted_to_mission_id IS 'ID de la mission créée depuis ce devis (si accepté)';
COMMENT ON COLUMN quotes.client_signature IS 'Image de signature du client en base64';
COMMENT ON COLUMN quotes.pdf_url IS 'URL du PDF généré (stockage Supabase Storage)';

-- Vue pour statistiques des devis
CREATE OR REPLACE VIEW quote_statistics AS
SELECT
  user_id,
  COUNT(*) AS total_quotes,
  COUNT(*) FILTER (WHERE status = 'draft') AS draft_count,
  COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
  COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_count,
  COUNT(*) FILTER (WHERE status = 'converted') AS converted_count,
  SUM(total_ht) FILTER (WHERE status = 'accepted') AS total_revenue_ht,
  SUM(total_ttc) FILTER (WHERE status = 'accepted') AS total_revenue_ttc,
  SUM(total_distance) FILTER (WHERE status = 'accepted') AS total_distance_km,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'accepted')::NUMERIC / 
    NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'accepted', 'rejected'))::NUMERIC, 0) * 100,
    2
  ) AS acceptance_rate_percentage,
  AVG(total_ht) FILTER (WHERE status = 'accepted') AS avg_quote_value_ht
FROM quotes
GROUP BY user_id;

COMMENT ON VIEW quote_statistics IS 'Statistiques des devis par utilisateur: taux d''acceptation, CA généré, distance totale';

-- Fonction pour obtenir les devis expirant bientôt (dans les 7 jours)
CREATE OR REPLACE FUNCTION get_expiring_quotes(days_before INTEGER DEFAULT 7)
RETURNS TABLE (
  id UUID,
  quote_number VARCHAR,
  client_name VARCHAR,
  total_ttc DECIMAL,
  valid_until DATE,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.quote_number,
    c.name AS client_name,
    q.total_ttc,
    q.valid_until,
    (q.valid_until - CURRENT_DATE)::INTEGER AS days_remaining
  FROM quotes q
  JOIN clients c ON c.id = q.client_id
  WHERE q.status IN ('draft', 'sent')
    AND q.valid_until BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_before)
  ORDER BY q.valid_until ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_expiring_quotes IS 'Retourne les devis qui expirent dans les N jours (par défaut 7)';

-- Fonction pour convertir un devis en mission
-- Note: Cette fonction est un placeholder. Adaptez-la selon votre schéma de missions existant.
CREATE OR REPLACE FUNCTION convert_quote_to_mission(quote_id UUID)
RETURNS UUID AS $$
DECLARE
  new_mission_id UUID;
  quote_data RECORD;
BEGIN
  -- Récupérer les données du devis
  SELECT * INTO quote_data
  FROM quotes
  WHERE id = quote_id AND status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found or not accepted';
  END IF;

  -- Générer un ID de mission (placeholder)
  new_mission_id := gen_random_uuid();

  -- TODO: Créer la mission selon votre schéma
  -- Décommentez et adaptez selon vos tables missions/mission_routes
  -- INSERT INTO missions (id, user_id, client_id, status, notes)
  -- VALUES (new_mission_id, quote_data.user_id, quote_data.client_id, 'pending', 
  --         'Créé depuis devis ' || quote_data.quote_number);

  -- Marquer le devis comme converti
  UPDATE quotes
  SET 
    converted_to_mission_id = new_mission_id,
    status = 'converted',
    converted_at = NOW()
  WHERE id = quote_id;

  RETURN new_mission_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION convert_quote_to_mission IS 'Convertit un devis accepté en mission (à adapter selon votre schéma missions)';

-- Données exemple (décommenter si besoin pour tests)
-- INSERT INTO quotes (
--   quote_number,
--   user_id,
--   client_id,
--   quote_date,
--   validity_days,
--   items,
--   total_ht,
--   total_ttc,
--   status
-- )
-- VALUES (
--   'DEV-202510-0001',
--   '00000000-0000-0000-0000-000000000000', -- Remplacer par ID user test
--   '00000000-0000-0000-0000-000000000001', -- Remplacer par ID client test
--   CURRENT_DATE,
--   30,
--   '[
--     {
--       "id": "1",
--       "pickup_address": "8 Boulevard du Palais, 75001 Paris",
--       "pickup_lat": 48.8566,
--       "pickup_lng": 2.3522,
--       "delivery_address": "Vieux-Port, 13001 Marseille",
--       "delivery_lat": 43.2965,
--       "delivery_lng": 5.3698,
--       "vehicle_type": "heavy",
--       "distance": 775.5,
--       "duration": 27000,
--       "price_ht": 1250.00,
--       "price_ttc": 1500.00,
--       "notes": "Livraison urgente"
--     }
--   ]'::jsonb,
--   1250.00,
--   1500.00,
--   'draft'
-- );
