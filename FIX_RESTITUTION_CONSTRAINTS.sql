-- ============================================================
-- FIX CRITIQUE: Supprimer les CHECK constraints qui bloquent la restitution
-- 
-- PROBLÈME 1: vehicle_inspections.inspection_type CHECK ne permet que 
--             ('departure', 'arrival') → bloque 'restitution_departure' et 'restitution_arrival'
--             → "Erreur de connexion au serveur" sur Flutter
--
-- PROBLÈME 2: inspection_report_shares.report_type CHECK ne permet que 
--             ('departure', 'arrival', 'complete') → bloque les tokens restitution
--             → rapport public restitution ne se crée pas
--
-- PROBLÈME 3: La RPC get_inspection_report_by_token ne retourne pas les inspections restitution
--             → rapport public n'affiche pas les sections restitution
--
-- À exécuter dans: Supabase SQL Editor
-- Projet: bfrkthzovwpjrvqktdjn.supabase.co
-- ============================================================

-- =============================================
-- 1. FIX vehicle_inspections.inspection_type
-- =============================================
ALTER TABLE public.vehicle_inspections 
  DROP CONSTRAINT IF EXISTS vehicle_inspections_inspection_type_check;

-- Ajouter le nouveau constraint avec les 4 types
ALTER TABLE public.vehicle_inspections 
  ADD CONSTRAINT vehicle_inspections_inspection_type_check 
  CHECK (inspection_type IN ('departure', 'arrival', 'restitution_departure', 'restitution_arrival'));

-- =============================================
-- 2. FIX inspection_report_shares.report_type
-- =============================================
ALTER TABLE public.inspection_report_shares 
  DROP CONSTRAINT IF EXISTS inspection_report_shares_report_type_check;

ALTER TABLE public.inspection_report_shares 
  ADD CONSTRAINT inspection_report_shares_report_type_check 
  CHECK (report_type IN (
    'departure', 'arrival', 'complete', 'both', 
    'restitution_departure', 'restitution_arrival', 'restitution_complete'
  ));

-- Migrer les anciens 'both' vers 'complete'
UPDATE public.inspection_report_shares 
  SET report_type = 'complete' 
  WHERE report_type = 'both';

-- =============================================
-- 3. REDEPLOY RPC get_inspection_report_by_token
--    avec support inspection_restitution_departure + arrival
-- =============================================
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
      'has_restitution', COALESCE(m.has_restitution, false),
      'restitution_vehicle_brand', m.restitution_vehicle_brand,
      'restitution_vehicle_model', m.restitution_vehicle_model,
      'restitution_vehicle_plate', m.restitution_vehicle_plate,
      'restitution_pickup_address', m.restitution_pickup_address,
      'restitution_delivery_address', m.restitution_delivery_address,
      'restitution_pickup_date', m.restitution_pickup_date,
      'restitution_delivery_date', m.restitution_delivery_date,
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
        'overall_condition', vi.overall_condition,
        'vehicle_info', vi.vehicle_info,
        'notes', vi.notes,
        'driver_name', vi.driver_name,
        'client_name', vi.client_name,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'latitude', vi.latitude,
        'longitude', vi.longitude,
        'photos', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', ip.id,
            'photo_url', ip.full_url,
            'thumbnail_url', ip.thumbnail_url,
            'photo_type', ip.photo_type,
            'taken_at', ip.taken_at
          ) ORDER BY ip.taken_at), '[]'::jsonb)
          FROM inspection_photos_v2 ip
          WHERE ip.inspection_id = vi.id
        ),
        'scanned_documents', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', doc.id,
            'document_url', doc.document_url,
            'document_type', doc.document_type,
            'document_title', doc.document_title,
            'title', COALESCE(doc.document_title, doc.document_type, 'Document'),
            'file_url', doc.document_url,
            'created_at', doc.created_at
          ) ORDER BY doc.created_at), '[]'::jsonb)
          FROM inspection_documents doc
          WHERE doc.inspection_id = vi.id
        )
      )
      FROM vehicle_inspections vi
      WHERE vi.mission_id = m.id
        AND vi.inspection_type = 'departure'
      ORDER BY vi.created_at DESC
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
        'overall_condition', vi.overall_condition,
        'vehicle_info', vi.vehicle_info,
        'notes', vi.notes,
        'driver_name', vi.driver_name,
        'client_name', vi.client_name,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'latitude', vi.latitude,
        'longitude', vi.longitude,
        'photos', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', ip.id,
            'photo_url', ip.full_url,
            'thumbnail_url', ip.thumbnail_url,
            'photo_type', ip.photo_type,
            'taken_at', ip.taken_at
          ) ORDER BY ip.taken_at), '[]'::jsonb)
          FROM inspection_photos_v2 ip
          WHERE ip.inspection_id = vi.id
        ),
        'scanned_documents', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', doc.id,
            'document_url', doc.document_url,
            'document_type', doc.document_type,
            'document_title', doc.document_title,
            'title', COALESCE(doc.document_title, doc.document_type, 'Document'),
            'file_url', doc.document_url,
            'created_at', doc.created_at
          ) ORDER BY doc.created_at), '[]'::jsonb)
          FROM inspection_documents doc
          WHERE doc.inspection_id = vi.id
        )
      )
      FROM vehicle_inspections vi
      WHERE vi.mission_id = m.id
        AND vi.inspection_type = 'arrival'
      ORDER BY vi.created_at DESC
      LIMIT 1
    ),
    'inspection_restitution_departure', (
      SELECT jsonb_build_object(
        'id', vi.id,
        'created_at', vi.created_at,
        'completed_at', vi.completed_at,
        'mileage_km', vi.mileage_km,
        'fuel_level', vi.fuel_level,
        'cleanliness_interior', vi.internal_cleanliness,
        'cleanliness_exterior', vi.external_cleanliness,
        'overall_condition', vi.overall_condition,
        'vehicle_info', vi.vehicle_info,
        'notes', vi.notes,
        'driver_name', vi.driver_name,
        'client_name', vi.client_name,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'latitude', vi.latitude,
        'longitude', vi.longitude,
        'photos', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', ip.id,
            'photo_url', ip.full_url,
            'thumbnail_url', ip.thumbnail_url,
            'photo_type', ip.photo_type,
            'taken_at', ip.taken_at
          ) ORDER BY ip.taken_at), '[]'::jsonb)
          FROM inspection_photos_v2 ip
          WHERE ip.inspection_id = vi.id
        ),
        'scanned_documents', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', doc.id,
            'document_url', doc.document_url,
            'document_type', doc.document_type,
            'document_title', doc.document_title,
            'title', COALESCE(doc.document_title, doc.document_type, 'Document'),
            'file_url', doc.document_url,
            'created_at', doc.created_at
          ) ORDER BY doc.created_at), '[]'::jsonb)
          FROM inspection_documents doc
          WHERE doc.inspection_id = vi.id
        )
      )
      FROM vehicle_inspections vi
      WHERE vi.mission_id = m.id
        AND vi.inspection_type = 'restitution_departure'
      ORDER BY vi.created_at DESC
      LIMIT 1
    ),
    'inspection_restitution_arrival', (
      SELECT jsonb_build_object(
        'id', vi.id,
        'created_at', vi.created_at,
        'completed_at', vi.completed_at,
        'mileage_km', vi.mileage_km,
        'fuel_level', vi.fuel_level,
        'cleanliness_interior', vi.internal_cleanliness,
        'cleanliness_exterior', vi.external_cleanliness,
        'overall_condition', vi.overall_condition,
        'vehicle_info', vi.vehicle_info,
        'notes', vi.notes,
        'driver_name', vi.driver_name,
        'client_name', vi.client_name,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'latitude', vi.latitude,
        'longitude', vi.longitude,
        'photos', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', ip.id,
            'photo_url', ip.full_url,
            'thumbnail_url', ip.thumbnail_url,
            'photo_type', ip.photo_type,
            'taken_at', ip.taken_at
          ) ORDER BY ip.taken_at), '[]'::jsonb)
          FROM inspection_photos_v2 ip
          WHERE ip.inspection_id = vi.id
        ),
        'scanned_documents', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', doc.id,
            'document_url', doc.document_url,
            'document_type', doc.document_type,
            'document_title', doc.document_title,
            'title', COALESCE(doc.document_title, doc.document_type, 'Document'),
            'file_url', doc.document_url,
            'created_at', doc.created_at
          ) ORDER BY doc.created_at), '[]'::jsonb)
          FROM inspection_documents doc
          WHERE doc.inspection_id = vi.id
        )
      )
      FROM vehicle_inspections vi
      WHERE vi.mission_id = m.id
        AND vi.inspection_type = 'restitution_arrival'
      ORDER BY vi.created_at DESC
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
