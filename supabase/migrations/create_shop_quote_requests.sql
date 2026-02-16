-- ============================================
-- TABLE: shop_quote_requests
-- Description: Demandes de devis pour offres personnalisées
-- ============================================

CREATE TABLE IF NOT EXISTS public.shop_quote_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  expected_volume text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'contacted'::text, 'quoted'::text, 'closed'::text, 'rejected'::text])),
  admin_notes text,
  responded_at timestamp with time zone,
  responded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shop_quote_requests_pkey PRIMARY KEY (id),
  CONSTRAINT shop_quote_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT shop_quote_requests_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES auth.users(id)
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_shop_quote_requests_user_id ON public.shop_quote_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_quote_requests_status ON public.shop_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_shop_quote_requests_created_at ON public.shop_quote_requests(created_at DESC);

-- RLS Policies
ALTER TABLE public.shop_quote_requests ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "Users can view own quote requests"
  ON public.shop_quote_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Les utilisateurs peuvent créer leurs propres demandes
CREATE POLICY "Users can insert own quote requests"
  ON public.shop_quote_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Les admins peuvent tout voir et modifier
CREATE POLICY "Admins can view all quote requests"
  ON public.shop_quote_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update quote requests"
  ON public.shop_quote_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_shop_quote_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_quote_requests_updated_at
  BEFORE UPDATE ON public.shop_quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_quote_requests_updated_at();

-- Commentaires
COMMENT ON TABLE public.shop_quote_requests IS 'Demandes de devis pour offres personnalisées depuis la boutique';
COMMENT ON COLUMN public.shop_quote_requests.status IS 'pending: en attente, contacted: contacté, quoted: devis envoyé, closed: accepté, rejected: refusé';
COMMENT ON COLUMN public.shop_quote_requests.expected_volume IS 'Volume mensuel estimé (texte libre)';
COMMENT ON COLUMN public.shop_quote_requests.admin_notes IS 'Notes internes pour le suivi admin';
COMMENT ON COLUMN public.shop_quote_requests.responded_by IS 'ID de l''admin qui a répondu';
