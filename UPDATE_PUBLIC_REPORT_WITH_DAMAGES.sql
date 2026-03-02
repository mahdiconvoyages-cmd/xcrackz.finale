-- ============================================
-- MIGRATION: Update get_public_report_data to include damages
-- Adds inspection_damages data to public report
-- ============================================

CREATE OR REPLACE FUNCTION get_public_report_data(p_share_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report public_inspection_reports;
  v_result jsonb;
BEGIN
  -- Récupérer le rapport
  SELECT * INTO v_report
  FROM public_inspection_reports
  WHERE share_token = p_share_token;

  IF v_report IS NULL THEN
    RETURN jsonb_build_object('error', 'Report not found');
  END IF;

  -- Vérifier expiration
  IF v_report.expires_at IS NOT NULL AND v_report.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'Report expired');
  END IF;

  -- Incrémenter le compteur
  PERFORM increment_report_view_count(p_share_token);

  -- Construire le résultat complet
  SELECT jsonb_build_object(
    'share_token', v_report.share_token,
    'created_at', v_report.created_at,
    'view_count', v_report.view_count + 1,
    'mission', (
      SELECT jsonb_build_object(
        'id', m.id,
        'reference', m.reference,
        'pickup_location', m.pickup_location,
        'delivery_location', m.delivery_location,
        'status', m.status,
        'vehicle', (
          SELECT jsonb_build_object(
            'id', v.id,
            'brand', v.brand,
            'model', v.model,
            'plate', v.plate,
            'vehicle_type', v.vehicle_type
          )
          FROM vehicles v
          WHERE v.id = m.vehicle_id
        )
      )
      FROM missions m
      WHERE m.id = v_report.mission_id
    ),
    'departure', (
      SELECT jsonb_build_object(
        'id', vi.id,
        'inspection_type', vi.inspection_type,
        'datetime', vi.created_at,
        'location', vi.location,
        'notes', vi.notes,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'status', vi.status,
        'vehicle_condition', vi.vehicle_condition,
        'internal_cleanliness', vi.internal_cleanliness,
        'external_cleanliness', vi.external_cleanliness,
        'photos', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'photo_url', COALESCE(p.photo_url, p.full_url),
              'thumbnail_url', p.thumbnail_url,
              'photo_type', p.photo_type,
              'created_at', p.created_at
            ) ORDER BY p.created_at
          )
          FROM (
            SELECT id, photo_url, NULL as full_url, NULL as thumbnail_url, photo_type, created_at
            FROM inspection_photos
            WHERE inspection_id = v_report.departure_inspection_id
            UNION ALL
            SELECT id, NULL as photo_url, full_url, thumbnail_url, photo_type, created_at
            FROM inspection_photos_v2
            WHERE inspection_id = v_report.departure_inspection_id
          ) p
        ), '[]'::jsonb),
        'damages', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', d.id,
              'damage_type', d.damage_type,
              'severity', d.severity,
              'location', d.location,
              'description', d.description,
              'photo_url', d.photo_url
            ) ORDER BY d.created_at
          )
          FROM inspection_damages d
          WHERE d.inspection_id = v_report.departure_inspection_id
        ), '[]'::jsonb)
      )
      FROM vehicle_inspections vi
      WHERE vi.id = v_report.departure_inspection_id
    ),
    'arrival', (
      SELECT jsonb_build_object(
        'id', vi.id,
        'inspection_type', vi.inspection_type,
        'datetime', vi.created_at,
        'location', vi.location,
        'notes', vi.notes,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'status', vi.status,
        'vehicle_condition', vi.vehicle_condition,
        'internal_cleanliness', vi.internal_cleanliness,
        'external_cleanliness', vi.external_cleanliness,
        'photos', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'photo_url', COALESCE(p.photo_url, p.full_url),
              'thumbnail_url', p.thumbnail_url,
              'photo_type', p.photo_type,
              'created_at', p.created_at
            ) ORDER BY p.created_at
          )
          FROM (
            SELECT id, photo_url, NULL as full_url, NULL as thumbnail_url, photo_type, created_at
            FROM inspection_photos
            WHERE inspection_id = v_report.arrival_inspection_id
            UNION ALL
            SELECT id, NULL as photo_url, full_url, thumbnail_url, photo_type, created_at
            FROM inspection_photos_v2
            WHERE inspection_id = v_report.arrival_inspection_id
          ) p
        ), '[]'::jsonb),
        'damages', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', d.id,
              'damage_type', d.damage_type,
              'severity', d.severity,
              'location', d.location,
              'description', d.description,
              'photo_url', d.photo_url
            ) ORDER BY d.created_at
          )
          FROM inspection_damages d
          WHERE d.inspection_id = v_report.arrival_inspection_id
        ), '[]'::jsonb)
      )
      FROM vehicle_inspections vi
      WHERE vi.id = v_report.arrival_inspection_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_public_report_data(text) TO anon, authenticated;

COMMENT ON FUNCTION get_public_report_data IS 
  'Récupère toutes les données d''un rapport public par token, incluant mission, véhicule, inspections, photos, signatures, dommages et notes.';
