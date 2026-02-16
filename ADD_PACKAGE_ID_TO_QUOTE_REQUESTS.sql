-- Ajouter colonne package_id à shop_quote_requests
-- Pour lier une demande à un package spécifique de crédits

ALTER TABLE public.shop_quote_requests 
ADD COLUMN IF NOT EXISTS package_id uuid;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_shop_quote_requests_package_id 
ON public.shop_quote_requests(package_id);

-- Commentaire
COMMENT ON COLUMN public.shop_quote_requests.package_id IS 'ID du package de crédits demandé (facultatif)';
