-- Migration: Système de limitation des requêtes IA par abonnement
-- Date: 2025-10-12

-- Table pour tracker les requêtes IA par utilisateur
CREATE TABLE IF NOT EXISTS public.ai_requests_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_key text NOT NULL, -- Format: 'YYYY-MM' (ex: '2025-10')
  request_count integer NOT NULL DEFAULT 0,
  last_request_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_requests_usage_pkey PRIMARY KEY (id),
  CONSTRAINT ai_requests_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT ai_requests_usage_user_month_unique UNIQUE (user_id, month_key)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_ai_requests_usage_user_id ON public.ai_requests_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_usage_month_key ON public.ai_requests_usage(month_key);

-- Fonction pour obtenir la clé du mois actuel
CREATE OR REPLACE FUNCTION get_current_month_key()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT TO_CHAR(NOW(), 'YYYY-MM');
$$;

-- Fonction pour incrémenter le compteur de requêtes
CREATE OR REPLACE FUNCTION increment_ai_request(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_key text;
  v_current_count integer;
BEGIN
  -- Obtenir la clé du mois actuel
  v_month_key := get_current_month_key();
  
  -- Insérer ou mettre à jour le compteur
  INSERT INTO public.ai_requests_usage (user_id, month_key, request_count, last_request_at)
  VALUES (p_user_id, v_month_key, 1, NOW())
  ON CONFLICT (user_id, month_key)
  DO UPDATE SET
    request_count = ai_requests_usage.request_count + 1,
    last_request_at = NOW(),
    updated_at = NOW()
  RETURNING request_count INTO v_current_count;
  
  RETURN v_current_count;
END;
$$;

-- Fonction pour obtenir le nombre de requêtes du mois
CREATE OR REPLACE FUNCTION get_ai_requests_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_key text;
  v_count integer;
BEGIN
  v_month_key := get_current_month_key();
  
  SELECT COALESCE(request_count, 0)
  INTO v_count
  FROM public.ai_requests_usage
  WHERE user_id = p_user_id AND month_key = v_month_key;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Ajouter des commentaires
COMMENT ON TABLE public.ai_requests_usage IS 'Suivi des requêtes IA par utilisateur et par mois';
COMMENT ON COLUMN public.ai_requests_usage.month_key IS 'Clé du mois au format YYYY-MM';
COMMENT ON COLUMN public.ai_requests_usage.request_count IS 'Nombre de requêtes IA ce mois-ci';

-- Politiques RLS
ALTER TABLE public.ai_requests_usage ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir uniquement leurs propres stats
CREATE POLICY "Users can view own AI usage"
  ON public.ai_requests_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Le système peut insérer/mettre à jour
CREATE POLICY "System can manage AI usage"
  ON public.ai_requests_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_requests_usage TO authenticated;
GRANT EXECUTE ON FUNCTION increment_ai_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_requests_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_month_key() TO authenticated;

-- Nettoyage automatique des anciennes données (optionnel, garde 12 mois)
CREATE OR REPLACE FUNCTION cleanup_old_ai_requests()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.ai_requests_usage
  WHERE created_at < NOW() - INTERVAL '12 months';
END;
$$;

-- Vue pour les administrateurs
CREATE OR REPLACE VIEW admin_ai_usage_stats AS
SELECT 
  u.month_key,
  COUNT(DISTINCT u.user_id) as active_users,
  SUM(u.request_count) as total_requests,
  AVG(u.request_count) as avg_requests_per_user,
  MAX(u.request_count) as max_requests_per_user
FROM public.ai_requests_usage u
GROUP BY u.month_key
ORDER BY u.month_key DESC;

GRANT SELECT ON admin_ai_usage_stats TO authenticated;
