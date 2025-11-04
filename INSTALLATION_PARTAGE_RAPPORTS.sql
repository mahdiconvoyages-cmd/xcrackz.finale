-- ========================================
-- 🔗 SYSTÈME DE PARTAGE DE RAPPORTS D'INSPECTION
-- ========================================
-- À exécuter dans Supabase SQL Editor
-- ========================================

-- 1️⃣ Créer la table de partages
CREATE TABLE IF NOT EXISTS public.inspection_report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  report_type TEXT NOT NULL CHECK (report_type IN ('departure', 'arrival', 'complete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT unique_mission_type UNIQUE (mission_id, report_type)
);

-- 2️⃣ Créer les index pour performance
CREATE INDEX IF NOT EXISTS idx_inspection_report_shares_token 
  ON public.inspection_report_shares(share_token);

CREATE INDEX IF NOT EXISTS idx_inspection_report_shares_mission 
  ON public.inspection_report_shares(mission_id);

CREATE INDEX IF NOT EXISTS idx_inspection_report_shares_user 
  ON public.inspection_report_shares(user_id);

-- 3️⃣ Activer RLS (Row Level Security)
ALTER TABLE public.inspection_report_shares ENABLE ROW LEVEL SECURITY;

-- 4️⃣ Créer les policies de sécurité
CREATE POLICY "Users can view own shares"
  ON public.inspection_report_shares
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own shares"
  ON public.inspection_report_shares
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shares"
  ON public.inspection_report_shares
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shares"
  ON public.inspection_report_shares
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5️⃣ Fonction pour créer ou obtenir un partage
CREATE OR REPLACE FUNCTION create_or_get_inspection_share(
  p_mission_id UUID,
  p_user_id UUID,
  p_report_type TEXT
)
RETURNS TABLE (
  id UUID,
  mission_id UUID,
  user_id UUID,
  share_token TEXT,
  report_type TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  access_count INTEGER,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share_token TEXT;
  v_existing_share RECORD;
BEGIN
  -- Vérifier si un partage existe déjà
  SELECT * INTO v_existing_share
  FROM public.inspection_report_shares
  WHERE inspection_report_shares.mission_id = p_mission_id
    AND inspection_report_shares.user_id = p_user_id
    AND inspection_report_shares.report_type = p_report_type
    AND inspection_report_shares.is_active = TRUE;
  
  -- Si existe, le retourner
  IF FOUND THEN
    RETURN QUERY
    SELECT 
      v_existing_share.id,
      v_existing_share.mission_id,
      v_existing_share.user_id,
      v_existing_share.share_token,
      v_existing_share.report_type,
      v_existing_share.created_at,
      v_existing_share.expires_at,
      v_existing_share.access_count,
      v_existing_share.last_accessed_at,
      v_existing_share.is_active;
  ELSE
    -- Sinon, créer un nouveau partage
    v_share_token := encode(gen_random_bytes(16), 'base64');
    v_share_token := replace(replace(replace(v_share_token, '+', '-'), '/', '_'), '=', '');
    
    RETURN QUERY
    INSERT INTO public.inspection_report_shares (
      mission_id,
      user_id,
      share_token,
      report_type
    )
    VALUES (
      p_mission_id,
      p_user_id,
      v_share_token,
      p_report_type
    )
    RETURNING *;
  END IF;
END;
$$;

-- 6️⃣ Fonction pour récupérer un rapport par token (PUBLIC - pas d'auth requise)
CREATE OR REPLACE FUNCTION get_inspection_report_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share RECORD;
  v_result JSON;
BEGIN
  -- Récupérer le partage
  SELECT * INTO v_share
  FROM public.inspection_report_shares
  WHERE share_token = p_token
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Token invalide ou expiré');
  END IF;
  
  -- Incrémenter le compteur d'accès
  UPDATE public.inspection_report_shares
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE id = v_share.id;
  
  -- Retourner les données du rapport
  SELECT json_build_object(
    'mission_id', v_share.mission_id,
    'report_type', v_share.report_type,
    'created_at', v_share.created_at
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 7️⃣ Donner les permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_report_shares TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_get_inspection_share TO authenticated;
GRANT EXECUTE ON FUNCTION get_inspection_report_by_token TO anon;
GRANT EXECUTE ON FUNCTION get_inspection_report_by_token TO authenticated;

-- ========================================
-- ✅ INSTALLATION TERMINÉE !
-- ========================================
-- Vous pouvez maintenant :
-- 1. Cliquer sur le bouton "Partager" dans les rapports
-- 2. Générer des liens publics
-- 3. Les partager avec vos clients
-- ========================================
