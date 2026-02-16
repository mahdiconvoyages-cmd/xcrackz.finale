-- Migration: Système amélioré de missions avec revenus et demandes de contact
-- Date: 2025-10-12
-- Description: Ajout de tracking des revenus par mission et système de demandes de contact

-- ==========================================
-- 1. TABLE: contact_requests (Demandes de contact)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL, -- Utilisateur qui fait la demande
  target_email text NOT NULL, -- Email du contact à ajouter
  target_name text, -- Nom du contact (optionnel)
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message text, -- Message de la demande
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  CONSTRAINT contact_requests_pkey PRIMARY KEY (id),
  CONSTRAINT contact_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_contact_requests_requester_id ON public.contact_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_target_email ON public.contact_requests(target_email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests(status);

-- Commentaires
COMMENT ON TABLE public.contact_requests IS 'Demandes d''ajout de contacts entre utilisateurs';
COMMENT ON COLUMN public.contact_requests.requester_id IS 'ID de l''utilisateur qui demande l''ajout';
COMMENT ON COLUMN public.contact_requests.target_email IS 'Email du contact à ajouter';
COMMENT ON COLUMN public.contact_requests.status IS 'pending, accepted, rejected, cancelled';

-- ==========================================
-- 2. TABLE: mission_revenue_logs (Historique des revenus par mission)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.mission_revenue_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mission_reference text NOT NULL,
  revenue_type text NOT NULL CHECK (revenue_type IN ('received_mission', 'assigned_commission')),
  amount numeric NOT NULL DEFAULT 0,
  description text,
  month_key text NOT NULL, -- Format: 'YYYY-MM'
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mission_revenue_logs_pkey PRIMARY KEY (id),
  CONSTRAINT mission_revenue_logs_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE,
  CONSTRAINT mission_revenue_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_mission_revenue_logs_user_id ON public.mission_revenue_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_revenue_logs_mission_id ON public.mission_revenue_logs(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_revenue_logs_month_key ON public.mission_revenue_logs(month_key);

-- Commentaires
COMMENT ON TABLE public.mission_revenue_logs IS 'Historique des revenus générés par les missions';
COMMENT ON COLUMN public.mission_revenue_logs.revenue_type IS 'received_mission: revenu mission reçue, assigned_commission: commission mission assignée';
COMMENT ON COLUMN public.mission_revenue_logs.amount IS 'Montant du revenu en euros HT';

-- ==========================================
-- 3. COLONNES SUPPLÉMENTAIRES: missions
-- ==========================================
-- Ajouter les champs pour tracking complet des montants
ALTER TABLE public.missions
ADD COLUMN IF NOT EXISTS mission_total_ht numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS provider_amount_ht numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pickup_contact_name text,
ADD COLUMN IF NOT EXISTS pickup_contact_phone text,
ADD COLUMN IF NOT EXISTS delivery_contact_name text,
ADD COLUMN IF NOT EXISTS delivery_contact_phone text,
ADD COLUMN IF NOT EXISTS vehicle_image_url text,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS report_id uuid;

-- Commentaires
COMMENT ON COLUMN public.missions.mission_total_ht IS 'Montant total de la mission (HT) pour donneur d''ordre';
COMMENT ON COLUMN public.missions.provider_amount_ht IS 'Montant versé au prestataire (HT)';
COMMENT ON COLUMN public.missions.company_commission IS 'Commission/revenu du donneur d''ordre (HT)';
COMMENT ON COLUMN public.missions.completed_at IS 'Date et heure de complétion de la mission';
COMMENT ON COLUMN public.missions.report_id IS 'ID du rapport de mission si disponible';

-- ==========================================
-- 4. FONCTIONS: Gestion des revenus
-- ==========================================

-- Fonction pour enregistrer un revenu de mission
CREATE OR REPLACE FUNCTION log_mission_revenue(
  p_mission_id uuid,
  p_user_id uuid,
  p_mission_reference text,
  p_revenue_type text,
  p_amount numeric,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_key text;
  v_log_id uuid;
BEGIN
  -- Obtenir la clé du mois actuel
  v_month_key := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Insérer le log de revenu
  INSERT INTO public.mission_revenue_logs (
    mission_id,
    user_id,
    mission_reference,
    revenue_type,
    amount,
    description,
    month_key
  )
  VALUES (
    p_mission_id,
    p_user_id,
    p_mission_reference,
    p_revenue_type,
    p_amount,
    p_description,
    v_month_key
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Fonction pour obtenir les revenus du mois
CREATE OR REPLACE FUNCTION get_monthly_revenue(p_user_id uuid, p_month_key text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_key text;
  v_total_revenue numeric;
BEGIN
  -- Utiliser le mois actuel si non spécifié
  v_month_key := COALESCE(p_month_key, TO_CHAR(NOW(), 'YYYY-MM'));
  
  -- Calculer le total des revenus
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_revenue
  FROM public.mission_revenue_logs
  WHERE user_id = p_user_id AND month_key = v_month_key;
  
  RETURN v_total_revenue;
END;
$$;

-- Fonction pour obtenir le détail des revenus par type
CREATE OR REPLACE FUNCTION get_revenue_breakdown(p_user_id uuid, p_month_key text DEFAULT NULL)
RETURNS TABLE (
  revenue_type text,
  total_amount numeric,
  count_missions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_key text;
BEGIN
  v_month_key := COALESCE(p_month_key, TO_CHAR(NOW(), 'YYYY-MM'));
  
  RETURN QUERY
  SELECT 
    mrl.revenue_type,
    SUM(mrl.amount) as total_amount,
    COUNT(DISTINCT mrl.mission_id) as count_missions
  FROM public.mission_revenue_logs mrl
  WHERE mrl.user_id = p_user_id AND mrl.month_key = v_month_key
  GROUP BY mrl.revenue_type;
END;
$$;

-- ==========================================
-- 5. FONCTIONS: Gestion des demandes de contact
-- ==========================================

-- Fonction pour créer une demande de contact
CREATE OR REPLACE FUNCTION create_contact_request(
  p_requester_id uuid,
  p_target_email text,
  p_target_name text DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
  v_existing_request uuid;
BEGIN
  -- Vérifier s'il existe déjà une demande en attente
  SELECT id INTO v_existing_request
  FROM public.contact_requests
  WHERE requester_id = p_requester_id 
    AND target_email = p_target_email
    AND status = 'pending'
  LIMIT 1;
  
  IF v_existing_request IS NOT NULL THEN
    -- Une demande existe déjà
    RETURN v_existing_request;
  END IF;
  
  -- Créer la nouvelle demande
  INSERT INTO public.contact_requests (
    requester_id,
    target_email,
    target_name,
    message,
    status
  )
  VALUES (
    p_requester_id,
    p_target_email,
    p_target_name,
    p_message,
    'pending'
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- Fonction pour accepter une demande de contact
CREATE OR REPLACE FUNCTION accept_contact_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_requester_id uuid;
  v_target_email text;
  v_success boolean := false;
BEGIN
  -- Récupérer les infos de la demande
  SELECT requester_id, target_email
  INTO v_requester_id, v_target_email
  FROM public.contact_requests
  WHERE id = p_request_id AND status = 'pending';
  
  IF v_requester_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Mettre à jour le statut
  UPDATE public.contact_requests
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- TODO: Créer le contact dans la table contacts si besoin
  -- Cette partie peut être gérée par le service TypeScript
  
  RETURN true;
END;
$$;

-- ==========================================
-- 6. VUES: Statistiques
-- ==========================================

-- Vue pour les revenus mensuels par utilisateur
CREATE OR REPLACE VIEW user_monthly_revenue_stats AS
SELECT 
  user_id,
  month_key,
  revenue_type,
  SUM(amount) as total_revenue,
  COUNT(DISTINCT mission_id) as mission_count
FROM public.mission_revenue_logs
GROUP BY user_id, month_key, revenue_type
ORDER BY month_key DESC, user_id;

-- Vue pour les demandes de contact en attente
CREATE OR REPLACE VIEW pending_contact_requests AS
SELECT 
  cr.*,
  p.email as requester_email,
  p.first_name as requester_first_name,
  p.last_name as requester_last_name
FROM public.contact_requests cr
JOIN public.profiles p ON cr.requester_id = p.id
WHERE cr.status = 'pending'
ORDER BY cr.created_at DESC;

-- ==========================================
-- 7. POLITIQUES RLS
-- ==========================================

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_revenue_logs ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres demandes de contact
CREATE POLICY "Users can view own contact requests"
  ON public.contact_requests
  FOR SELECT
  USING (
    auth.uid() = requester_id 
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE email = target_email)
  );

-- Les utilisateurs peuvent créer leurs propres demandes
CREATE POLICY "Users can create contact requests"
  ON public.contact_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Les utilisateurs peuvent mettre à jour les demandes qui les concernent
CREATE POLICY "Users can update relevant contact requests"
  ON public.contact_requests
  FOR UPDATE
  USING (
    auth.uid() = requester_id 
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE email = target_email)
  );

-- Les utilisateurs peuvent voir leurs propres revenus
CREATE POLICY "Users can view own revenue logs"
  ON public.mission_revenue_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Le système peut gérer les revenus
CREATE POLICY "System can manage revenue logs"
  ON public.mission_revenue_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- 8. PERMISSIONS
-- ==========================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contact_requests TO authenticated;
GRANT SELECT, INSERT ON public.mission_revenue_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_mission_revenue TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_revenue TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION create_contact_request TO authenticated;
GRANT EXECUTE ON FUNCTION accept_contact_request TO authenticated;
GRANT SELECT ON user_monthly_revenue_stats TO authenticated;
GRANT SELECT ON pending_contact_requests TO authenticated;

-- ==========================================
-- 9. TRIGGERS
-- ==========================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
