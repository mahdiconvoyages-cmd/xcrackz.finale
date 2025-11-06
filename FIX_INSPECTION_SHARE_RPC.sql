-- ================================================
-- FIX FONCTION RPC POUR PARTAGE RAPPORTS INSPECTION
-- ================================================
-- Problème : La fonction cherche dans des tables inexistantes
-- Solution : Utiliser inspection_photos_v2 au lieu de inspection_photos
-- ================================================

-- 1. Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_inspection_report_by_token(TEXT);

-- 2. Recréer avec les bonnes tables
CREATE OR REPLACE FUNCTION get_inspection_report_by_token(
  p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_share_record RECORD;
  v_result JSONB;
BEGIN
  -- Vérifier si le token existe et est actif
  SELECT * INTO v_share_record
  FROM inspection_report_shares
  WHERE share_token = p_token
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token invalide ou expiré');
  END IF;

  -- Mettre à jour le compteur d'accès
  UPDATE inspection_report_shares
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE share_token = p_token;

  -- Récupérer toutes les données du rapport
  SELECT jsonb_build_object(
    'mission_data', jsonb_build_object(
      'id', m.id,
      'reference', m.reference,
      'pickup_address', m.pickup_address,
      'delivery_address', m.delivery_address,
      'pickup_date', m.pickup_date,
      'delivery_date', m.delivery_date,
      'status', m.status
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
    )
  ) INTO v_result
  FROM missions m
  WHERE m.id = v_share_record.mission_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION get_inspection_report_by_token(TEXT) TO anon, authenticated;

-- Test de la fonction (optionnel)
COMMENT ON FUNCTION get_inspection_report_by_token(TEXT) IS 'Récupère un rapport d''inspection via son token de partage';
