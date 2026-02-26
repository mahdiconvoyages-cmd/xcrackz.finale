-- ================================================
-- RPC: get_full_inspection_report(token)
-- Objectif: Retourner un rapport complet en format TIMELINE
-- Structure: mission + vehicle + événements chronologiques
-- Événements: inspections (départ/arrivée), documents, dépenses
-- Sûr à exécuter plusieurs fois (idempotent)
-- ================================================

DROP FUNCTION IF EXISTS get_full_inspection_report(TEXT);
CREATE OR REPLACE FUNCTION get_full_inspection_report(
  p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_share_record RECORD;
  v_mission_id UUID;
  v_result JSONB;
  v_timeline JSONB;
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

  v_mission_id := v_share_record.mission_id;

  -- Construire la timeline en agrégant tous les événements
  SELECT jsonb_agg(event ORDER BY event->>'timestamp')
  INTO v_timeline
  FROM (
    -- Événements: Inspection Départ
    SELECT jsonb_build_object(
      'event_type', 'departure_inspection',
      'timestamp', vi.created_at,
      'inspection_id', vi.id,
      'data', jsonb_build_object(
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
        'driver_name', vi.driver_name,
        'client_name', vi.client_name,
        'latitude', vi.latitude,
        'longitude', vi.longitude,
        'has_security_kit', COALESCE((vi.vehicle_info->>'has_security_kit')::boolean, false),
        'has_spare_wheel', COALESCE((vi.vehicle_info->>'has_spare_wheel')::boolean, false),
        'has_inflation_kit', COALESCE((vi.vehicle_info->>'has_inflation_kit')::boolean, false),
        'has_fuel_card', COALESCE((vi.vehicle_info->>'has_fuel_card')::boolean, false),
        'is_loaded', COALESCE((vi.vehicle_info->>'is_loaded')::boolean, false),
        'has_confided_object', COALESCE((vi.vehicle_info->>'has_confided_object')::boolean, false),
        'confided_object_description', vi.vehicle_info->>'confided_object_description',
        'photos', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', ip.id,
            'photo_url', ip.full_url,
            'thumbnail_url', ip.thumbnail_url,
            'photo_type', ip.photo_type,
            'damage_status', COALESCE(ip.damage_status, 'RAS'),
            'damage_comment', ip.damage_comment,
            'taken_at', ip.taken_at
          ) ORDER BY ip.taken_at)
          FROM inspection_photos_v2 ip
          WHERE ip.inspection_id = vi.id
        ), '[]'::jsonb),
        'damages', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', d.id,
            'damage_type', d.damage_type,
            'severity', d.severity,
            'location', d.location,
            'description', d.description,
            'photo_url', d.photo_url,
            'created_at', d.created_at
          ) ORDER BY d.created_at)
          FROM inspection_damages d
          WHERE d.inspection_id = vi.id
        ), '[]'::jsonb)
      )
    ) AS event
    FROM vehicle_inspections vi
    WHERE vi.mission_id = v_mission_id AND vi.inspection_type = 'departure'

    UNION ALL

    -- Événements: Inspection Arrivée
    SELECT jsonb_build_object(
      'event_type', 'arrival_inspection',
      'timestamp', vi.created_at,
      'inspection_id', vi.id,
      'data', jsonb_build_object(
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
        'driver_name', vi.driver_name,
        'client_name', vi.client_name,
        'latitude', vi.latitude,
        'longitude', vi.longitude,
        'has_security_kit', COALESCE((vi.vehicle_info->>'has_security_kit')::boolean, false),
        'has_spare_wheel', COALESCE((vi.vehicle_info->>'has_spare_wheel')::boolean, false),
        'has_inflation_kit', COALESCE((vi.vehicle_info->>'has_inflation_kit')::boolean, false),
        'has_fuel_card', COALESCE((vi.vehicle_info->>'has_fuel_card')::boolean, false),
        'is_loaded', COALESCE((vi.vehicle_info->>'is_loaded')::boolean, false),
        'has_confided_object', COALESCE((vi.vehicle_info->>'has_confided_object')::boolean, false),
        'confided_object_description', vi.vehicle_info->>'confided_object_description',
        'photos', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', ip.id,
            'photo_url', ip.full_url,
            'thumbnail_url', ip.thumbnail_url,
            'photo_type', ip.photo_type,
            'damage_status', COALESCE(ip.damage_status, 'RAS'),
            'damage_comment', ip.damage_comment,
            'taken_at', ip.taken_at
          ) ORDER BY ip.taken_at)
          FROM inspection_photos_v2 ip
          WHERE ip.inspection_id = vi.id
        ), '[]'::jsonb),
        'damages', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', d.id,
            'damage_type', d.damage_type,
            'severity', d.severity,
            'location', d.location,
            'description', d.description,
            'photo_url', d.photo_url,
            'created_at', d.created_at
          ) ORDER BY d.created_at)
          FROM inspection_damages d
          WHERE d.inspection_id = vi.id
        ), '[]'::jsonb)
      )
    ) AS event
    FROM vehicle_inspections vi
    WHERE vi.mission_id = v_mission_id AND vi.inspection_type = 'arrival'

    UNION ALL

    -- Événements: Documents scannés
    SELECT jsonb_build_object(
      'event_type', 'document_scanned',
      'timestamp', d.created_at,
      'document_id', d.id,
      'data', jsonb_build_object(
        'id', d.id,
        'title', d.document_title,
        'file_url', d.document_url,
        'mime_type', CASE
          WHEN lower(d.document_url) LIKE '%.pdf' THEN 'application/pdf'
          WHEN lower(d.document_url) LIKE '%.png' THEN 'image/png'
          WHEN lower(d.document_url) LIKE '%.jpg' OR lower(d.document_url) LIKE '%.jpeg' THEN 'image/jpeg'
          WHEN lower(d.document_url) LIKE '%.webp' THEN 'image/webp'
          ELSE NULL
        END,
        'created_at', d.created_at
      )
    ) AS event
    FROM inspection_documents d
    WHERE d.inspection_id IN (
      SELECT id FROM vehicle_inspections WHERE mission_id = v_mission_id
    )

    UNION ALL

    -- Événements: Dépenses/Frais
    SELECT jsonb_build_object(
      'event_type', 'expense_recorded',
      'timestamp', e.created_at,
      'expense_id', e.id,
      'data', jsonb_build_object(
        'id', e.id,
        'description', e.description,
        'expense_type', e.expense_type,
        'amount', e.amount,
        'created_at', e.created_at
      )
    ) AS event
    FROM inspection_expenses e
    WHERE e.inspection_id IN (
      SELECT id FROM vehicle_inspections WHERE mission_id = v_mission_id
    )
  ) events;

  -- Construire la réponse finale
  SELECT jsonb_build_object(
    'mission', jsonb_build_object(
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
      'vehicle_type', m.vehicle_type,
      'driver_name', COALESCE(
        (SELECT vi.driver_name FROM vehicle_inspections vi 
         WHERE vi.mission_id = m.id AND vi.inspection_type = 'departure' 
         ORDER BY vi.created_at DESC LIMIT 1),
        (SELECT vi.driver_name FROM vehicle_inspections vi 
         WHERE vi.mission_id = m.id AND vi.inspection_type = 'arrival' 
         ORDER BY vi.created_at DESC LIMIT 1)
      ),
      'driver_phone', COALESCE(m.driver_phone, m.pickup_contact_phone)
    ),
    'vehicle', jsonb_build_object(
      'brand', m.vehicle_brand,
      'model', m.vehicle_model,
      'plate', m.vehicle_plate,
      'vin', m.vehicle_vin,
      'year', m.vehicle_year,
      'color', m.vehicle_color
    ),
    'timeline', COALESCE(v_timeline, '[]'::jsonb),
    'report_type', v_share_record.report_type
  ) INTO v_result
  FROM missions m
  WHERE m.id = v_mission_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_full_inspection_report(TEXT) TO anon, authenticated;
