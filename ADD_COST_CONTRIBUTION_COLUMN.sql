-- Migration: Add cost_contribution column to ride_offers
-- Description: Champ optionnel "participation aux frais" sur les offres de lift
-- (covoiturage non lucratif — reste légal tant que le montant ne dépasse pas le partage de frais)

ALTER TABLE ride_offers
ADD COLUMN IF NOT EXISTS cost_contribution NUMERIC(6,2) DEFAULT NULL;

COMMENT ON COLUMN ride_offers.cost_contribution IS 'Participation aux frais en euros (optionnel, covoiturage non lucratif)';
