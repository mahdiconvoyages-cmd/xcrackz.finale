-- =====================================================
-- DÉPLOYER LA FONCTION DE PARTAGE D'INSPECTION
-- Exécutez ce fichier dans Supabase SQL Editor
-- =====================================================

-- 1. Créer la table inspection_report_shares si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.inspection_report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  report_type TEXT NOT NULL CHECK (report_type IN ('departure', 'arrival', 'both')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_token ON public.inspection_report_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_mission_report ON public.inspection_report_shares(mission_id, report_type);

-- 2. Créer la fonction RPC
CREATE OR REPLACE FUNCTION public.create_or_get_inspection_share(
  p_mission_id UUID,
  p_user_id UUID,
  p_report_type TEXT
)
RETURNS TABLE (
  share_url TEXT,
  share_token TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_token TEXT;
  v_existing_record RECORD;
BEGIN
  -- Vérifier si un partage existe déjà
  SELECT * INTO v_existing_record
  FROM public.inspection_report_shares
  WHERE mission_id = p_mission_id
    AND report_type = p_report_type
    AND is_active = TRUE;

  -- Si existe, retourner le lien existant
  IF FOUND THEN
    RETURN QUERY SELECT 
      'https://www.xcrackz.com/rapport-inspection/' || v_existing_record.share_token AS share_url,
      v_existing_record.share_token,
      v_existing_record.created_at;
    RETURN;
  END IF;

  -- Sinon, créer un nouveau token
  v_token := encode(gen_random_bytes(16), 'base64');
  v_token := replace(replace(replace(v_token, '/', ''), '+', ''), '=', '');

  -- Insérer le nouveau partage
  INSERT INTO public.inspection_report_shares (
    mission_id,
    user_id,
    share_token,
    report_type
  ) VALUES (
    p_mission_id,
    p_user_id,
    v_token,
    p_report_type
  );

  -- Retourner le lien
  RETURN QUERY SELECT 
    'https://www.xcrackz.com/rapport-inspection/' || v_token AS share_url,
    v_token,
    NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Donner les droits
GRANT EXECUTE ON FUNCTION public.create_or_get_inspection_share(UUID, UUID, TEXT) TO authenticated;

-- 4. Enable RLS
ALTER TABLE public.inspection_report_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS share_owner_policy ON public.inspection_report_shares;
DROP POLICY IF EXISTS share_public_read ON public.inspection_report_shares;

CREATE POLICY share_owner_policy ON public.inspection_report_shares
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY share_public_read ON public.inspection_report_shares
  FOR SELECT USING (is_active = TRUE);
