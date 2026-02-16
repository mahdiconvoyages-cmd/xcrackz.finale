-- Table pour stocker les liens de partage de rapports d'inspection
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

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_inspection_report_shares_token ON public.inspection_report_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_inspection_report_shares_mission ON public.inspection_report_shares(mission_id);
CREATE INDEX IF NOT EXISTS idx_inspection_report_shares_user ON public.inspection_report_shares(user_id);

-- RLS Policies
ALTER TABLE public.inspection_report_shares ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir et créer leurs propres partages
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

-- Fonction pour créer ou obtenir un lien de partage
CREATE OR REPLACE FUNCTION create_or_get_inspection_share(
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

-- Fonction pour récupérer un rapport via token (accès public) - VERSION JSONB et tables v2
CREATE OR REPLACE FUNCTION get_inspection_report_by_token(
  p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_share_record RECORD;
  v_result JSONB;
BEGIN
  -- Vérifier que le partage existe et est actif
  SELECT * INTO v_share_record
  FROM public.inspection_report_shares
  WHERE share_token = p_token
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token invalide ou expiré');
  END IF;

  -- Incrémenter le compteur d'accès
  UPDATE public.inspection_report_shares
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE share_token = p_token;

  -- Construire les données du rapport (JSONB)
  SELECT jsonb_build_object(
    'mission_data', jsonb_build_object(
      'id', m.id,
      'reference', m.reference,
      'status', m.status,
      'created_at', m.created_at,
      'pickup_date', m.pickup_date,
      'delivery_date', m.delivery_date,
      'pickup_address', m.pickup_address,
      'delivery_address', m.delivery_address,
      'vehicle_type', m.vehicle_type,
      'driver_name', COALESCE(
        (
          SELECT vi.driver_name
          FROM vehicle_inspections vi
          WHERE vi.mission_id = m.id AND vi.inspection_type = 'departure'
          ORDER BY vi.created_at DESC
          LIMIT 1
        ),
        (
          SELECT vi.driver_name
          FROM vehicle_inspections vi
          WHERE vi.mission_id = m.id AND vi.inspection_type = 'arrival'
          ORDER BY vi.created_at DESC
          LIMIT 1
        )
      )
    ),
    'vehicle_data', jsonb_build_object(
      'brand', m.vehicle_brand,
      'model', m.vehicle_model,
      'plate', m.vehicle_plate,
      'vin', m.vehicle_vin,
      'year', m.vehicle_year,
      'color', m.vehicle_color
    ),
    'inspection_departure', (
      SELECT jsonb_build_object(
        'id', vi.id,
        'created_at', vi.created_at,
        'completed_at', vi.completed_at,
        'mileage_km', vi.mileage_km,
        'fuel_level', vi.fuel_level,
        'cleanliness_interior', vi.internal_cleanliness,
        'cleanliness_exterior', vi.external_cleanliness,
        'notes', vi.notes,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'latitude', vi.latitude,
        'longitude', vi.longitude,
        'photos', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', ip.id,
            'photo_url', ip.full_url,
            'thumbnail_url', ip.thumbnail_url,
            'photo_type', ip.photo_type,
            'taken_at', ip.taken_at
          ) ORDER BY ip.taken_at)
          FROM inspection_photos_v2 ip
          WHERE ip.inspection_id = vi.id
        )
      )
      FROM vehicle_inspections vi
      WHERE vi.mission_id = m.id
        AND vi.inspection_type = 'departure'
      LIMIT 1
    ),
    'inspection_arrival', (
      SELECT jsonb_build_object(
        'id', vi.id,
        'created_at', vi.created_at,
        'completed_at', vi.completed_at,
        'mileage_km', vi.mileage_km,
        'fuel_level', vi.fuel_level,
        'cleanliness_interior', vi.internal_cleanliness,
        'cleanliness_exterior', vi.external_cleanliness,
        'notes', vi.notes,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'latitude', vi.latitude,
        'longitude', vi.longitude,
        'photos', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', ip.id,
            'photo_url', ip.full_url,
            'thumbnail_url', ip.thumbnail_url,
            'photo_type', ip.photo_type,
            'taken_at', ip.taken_at
          ) ORDER BY ip.taken_at)
          FROM inspection_photos_v2 ip
          WHERE ip.inspection_id = vi.id
        )
      )
      FROM vehicle_inspections vi
      WHERE vi.mission_id = m.id
        AND vi.inspection_type = 'arrival'
      LIMIT 1
    ),
    'report_type', v_share_record.report_type
  ) INTO v_result
  FROM missions m
  WHERE m.id = v_share_record.mission_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION create_or_get_inspection_share(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inspection_report_by_token(TEXT) TO anon, authenticated;
