-- ================================================
-- SYNC BACKEND PARTAGE RAPPORT D'INSPECTION (Supabase)
-- Sûr à exécuter plusieurs fois (idempotent)
-- ================================================

-- 1) Assurer l'URL de partage canonique (www.xcrackz.com)
--    Si une version existante retourne un autre type, il faut la supprimer d'abord
DROP FUNCTION IF EXISTS create_or_get_inspection_share(UUID, UUID, TEXT);
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
  SELECT * INTO v_existing_record
  FROM public.inspection_report_shares
  WHERE mission_id = p_mission_id
    AND report_type = p_report_type
    AND is_active = TRUE
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT 
      'https://www.xcrackz.com/rapport-inspection/' || v_existing_record.share_token AS share_url,
      v_existing_record.share_token,
      v_existing_record.created_at;
    RETURN;
  END IF;

  v_token := encode(gen_random_bytes(16), 'base64');
  v_token := replace(replace(replace(v_token, '/', ''), '+', ''), '=', '');

  INSERT INTO public.inspection_report_shares (mission_id, user_id, share_token, report_type)
  VALUES (p_mission_id, p_user_id, v_token, p_report_type);

  RETURN QUERY SELECT 
    'https://www.xcrackz.com/rapport-inspection/' || v_token AS share_url,
    v_token,
    NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_or_get_inspection_share(UUID, UUID, TEXT) TO authenticated;

-- 2) Fonction publique: JSONB + inspection_photos_v2 + mileage_km
DROP FUNCTION IF EXISTS get_inspection_report_by_token(TEXT);
CREATE OR REPLACE FUNCTION get_inspection_report_by_token(
  p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_share_record RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_share_record
  FROM public.inspection_report_shares
  WHERE share_token = p_token
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token invalide ou expiré');
  END IF;

  UPDATE public.inspection_report_shares
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE share_token = p_token;

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
      'pickup_contact_name', m.pickup_contact_name,
      'pickup_contact_phone', m.pickup_contact_phone,
      'delivery_contact_name', m.delivery_contact_name,
      'delivery_contact_phone', m.delivery_contact_phone,
      'driver_phone', m.driver_phone,
      'vehicle_type', m.vehicle_type,
      -- Le nom du convoyeur est stocké sur les inspections, on le remonte ici si disponible
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

GRANT EXECUTE ON FUNCTION get_inspection_report_by_token(TEXT) TO anon, authenticated;

-- 3) Optionnel (diagnostic rapide):
-- SELECT get_inspection_report_by_token('<collez_un_token>');
