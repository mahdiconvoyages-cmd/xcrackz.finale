-- Migration: Système de Grilles Tarifaires
-- Description: Permet aux convoyeurs de créer des grilles tarifaires personnalisées par client
-- Date: 14 Octobre 2025

-- Table: pricing_grids
CREATE TABLE IF NOT EXISTS pricing_grids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false,
  name VARCHAR(255) NOT NULL,
  
  -- Paliers de distance (forfaits HT) - Véhicule LÉGER
  tier_1_50_light DECIMAL(10, 2) DEFAULT 0,
  tier_51_100_light DECIMAL(10, 2) DEFAULT 0,
  tier_101_150_light DECIMAL(10, 2) DEFAULT 0,
  tier_151_300_light DECIMAL(10, 2) DEFAULT 0,
  rate_per_km_light DECIMAL(10, 2) DEFAULT 0,
  
  -- Paliers de distance (forfaits HT) - Véhicule UTILITAIRE
  tier_1_50_utility DECIMAL(10, 2) DEFAULT 0,
  tier_51_100_utility DECIMAL(10, 2) DEFAULT 0,
  tier_101_150_utility DECIMAL(10, 2) DEFAULT 0,
  tier_151_300_utility DECIMAL(10, 2) DEFAULT 0,
  rate_per_km_utility DECIMAL(10, 2) DEFAULT 0,
  
  -- Paliers de distance (forfaits HT) - Véhicule LOURD
  tier_1_50_heavy DECIMAL(10, 2) DEFAULT 0,
  tier_51_100_heavy DECIMAL(10, 2) DEFAULT 0,
  tier_101_150_heavy DECIMAL(10, 2) DEFAULT 0,
  tier_151_300_heavy DECIMAL(10, 2) DEFAULT 0,
  rate_per_km_heavy DECIMAL(10, 2) DEFAULT 0,
  
  -- Marges et suppléments
  margin_percentage DECIMAL(5, 2) DEFAULT 0,
  fixed_supplement DECIMAL(10, 2) DEFAULT 0,
  supplement_notes TEXT,
  
  -- TVA
  vat_rate DECIMAL(5, 2) DEFAULT 20.00,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_pricing_grids_user_id ON pricing_grids(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_grids_client_id ON pricing_grids(client_id);
CREATE INDEX IF NOT EXISTS idx_pricing_grids_global ON pricing_grids(is_global) WHERE is_global = true;

-- Contraintes uniques
-- Note: PostgreSQL n'aime pas les UNIQUE avec WHERE dans ALTER TABLE, on les met dans CREATE TABLE

-- RLS Policies
ALTER TABLE pricing_grids ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT (users can view own grids)
DROP POLICY IF EXISTS "Users can view own pricing grids" ON pricing_grids;
CREATE POLICY "Users can view own pricing grids"
  ON pricing_grids FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: INSERT (users can create own grids)
DROP POLICY IF EXISTS "Users can create own pricing grids" ON pricing_grids;
CREATE POLICY "Users can create own pricing grids"
  ON pricing_grids FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: UPDATE (users can update own grids)
DROP POLICY IF EXISTS "Users can update own pricing grids" ON pricing_grids;
CREATE POLICY "Users can update own pricing grids"
  ON pricing_grids FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: DELETE (users can delete own grids)
DROP POLICY IF EXISTS "Users can delete own pricing grids" ON pricing_grids;
CREATE POLICY "Users can delete own pricing grids"
  ON pricing_grids FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_pricing_grids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_grids_updated_at ON pricing_grids;
CREATE TRIGGER pricing_grids_updated_at
  BEFORE UPDATE ON pricing_grids
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_grids_updated_at();

-- Commentaires
COMMENT ON TABLE pricing_grids IS 'Grilles tarifaires personnalisées par client pour calcul automatique de devis';
COMMENT ON COLUMN pricing_grids.is_global IS 'True si grille par défaut pour tous les clients du user';
COMMENT ON COLUMN pricing_grids.client_id IS 'NULL pour grille globale, ID client pour grille spécifique';
COMMENT ON COLUMN pricing_grids.margin_percentage IS 'Marge en pourcentage à appliquer sur le prix de base';
COMMENT ON COLUMN pricing_grids.fixed_supplement IS 'Supplément fixe en euros (péages, urgence, etc.)';
COMMENT ON COLUMN pricing_grids.vat_rate IS 'Taux de TVA en pourcentage (par défaut 20%)';

-- Données exemple (grille globale par défaut pour tests)
-- Décommenter si besoin:
-- INSERT INTO pricing_grids (user_id, is_global, name, tier_1_50_light, tier_51_100_light, tier_101_150_light, tier_151_300_light, rate_per_km_light)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000', -- Remplacer par ID user test
--   true,
--   'Grille Globale Par Défaut',
--   120.00, -- 1-50km
--   180.00, -- 51-100km
--   250.00, -- 101-150km
--   350.00, -- 151-300km
--   1.50    -- 301km+ au km
-- );
