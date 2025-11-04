-- ========================================
-- 🔧 CORRECTION FONCTION RPC DE PARTAGE
-- ========================================
-- Cette fonction doit retourner TOUTES les données du rapport
-- Les infos véhicule sont dans la table missions
-- ========================================

CREATE OR REPLACE FUNCTION get_inspection_report_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share RECORD;
  v_mission RECORD;
  v_departure RECORD;
  v_arrival RECORD;
  v_departure_photos JSON;
  v_arrival_photos JSON;
  v_result JSON;
BEGIN
  -- 1️⃣ Récupérer le partage
  SELECT * INTO v_share
  FROM public.inspection_report_shares
  WHERE share_token = p_token
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Token invalide ou expiré');
  END IF;
  
  -- 2️⃣ Incrémenter le compteur d'accès
  UPDATE public.inspection_report_shares
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE id = v_share.id;
  
  -- 3️⃣ Récupérer les données de la mission (contient déjà les infos véhicule)
  SELECT * INTO v_mission
  FROM missions
  WHERE id = v_share.mission_id;
  
  -- 4️⃣ Récupérer l'inspection de départ
  SELECT * INTO v_departure
  FROM vehicle_inspections
  WHERE mission_id = v_share.mission_id
    AND inspection_type = 'departure'
  LIMIT 1;
  
  -- 5️⃣ Récupérer l'inspection d'arrivée
  SELECT * INTO v_arrival
  FROM vehicle_inspections
  WHERE mission_id = v_share.mission_id
    AND inspection_type = 'arrival'
  LIMIT 1;
  
  -- 6️⃣ Récupérer les photos de départ
  IF v_departure.id IS NOT NULL THEN
    SELECT json_agg(row_to_json(p)) INTO v_departure_photos
    FROM inspection_photos p
    WHERE p.inspection_id = v_departure.id;
  END IF;
  
  -- 7️⃣ Récupérer les photos d'arrivée
  IF v_arrival.id IS NOT NULL THEN
    SELECT json_agg(row_to_json(p)) INTO v_arrival_photos
    FROM inspection_photos p
    WHERE p.inspection_id = v_arrival.id;
  END IF;
  
  -- 8️⃣ Construire le résultat complet
  v_result := json_build_object(
    'mission_id', v_share.mission_id,
    'report_type', v_share.report_type,
    'created_at', v_share.created_at,
    'access_count', v_share.access_count,
    'mission_data', row_to_json(v_mission),
    'vehicle_data', json_build_object(
      'brand', v_mission.vehicle_brand,
      'model', v_mission.vehicle_model,
      'plate', v_mission.vehicle_plate,
      'vin', v_mission.vehicle_vin,
      'year', v_mission.vehicle_year,
      'color', v_mission.vehicle_color
    ),
    'inspection_departure', json_build_object(
      'data', row_to_json(v_departure),
      'photos', COALESCE(v_departure_photos, '[]'::json)
    ),
    'inspection_arrival', json_build_object(
      'data', row_to_json(v_arrival),
      'photos', COALESCE(v_arrival_photos, '[]'::json)
    )
  );
  
  RETURN v_result;
END;
$$;

-- ========================================
-- ✅ CORRECTION APPLIQUÉE !
-- ========================================
-- Maintenant la fonction retourne :
-- - mission_data : Toutes les infos de la mission
-- - vehicle_data : Infos véhicule extraites de missions
-- - inspection_departure : Inspection + photos de départ
-- - inspection_arrival : Inspection + photos d'arrivée
-- - report_type : Type de rapport (departure/arrival/complete)
-- ========================================
