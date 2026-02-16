-- =============================================
-- FONCTION RPC SÉCURISÉE: Clôture de mission par le convoyeur
-- Bypass RLS car les colonnes driver/assigned ne sont pas toujours remplies
-- =============================================

CREATE OR REPLACE FUNCTION close_mission_after_arrival(p_mission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
SET search_path = public
AS $$
DECLARE
  v_mission record;
  v_user_id uuid;
BEGIN
  -- Récupérer l'utilisateur actuel
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Non authentifié'
    );
  END IF;

  -- Récupérer la mission
  SELECT * INTO v_mission
  FROM missions
  WHERE id = p_mission_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Mission introuvable'
    );
  END IF;

  -- Pas de vérification de droits stricte
  -- Si l'utilisateur authentifié a pu créer l'inspection, il peut clôturer
  -- (L'inspection elle-même est protégée par RLS)
  
  -- Vérification: créateur OU a créé une inspection pour cette mission
  IF v_user_id != v_mission.user_id THEN
    -- Vérifier si l'utilisateur a créé une inspection pour cette mission
    -- via la table vehicle_inspections (inspector_id lié à profiles)
    IF NOT EXISTS (
      SELECT 1 
      FROM vehicle_inspections vi
      INNER JOIN profiles p ON vi.inspector_id = p.id
      WHERE vi.mission_id = p_mission_id
      AND p.id = v_user_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Non autorisé: vous n''avez pas d''inspection sur cette mission'
      );
    END IF;
  END IF;

  -- Mettre à jour la mission (bypass RLS grâce à SECURITY DEFINER)
  -- Les inspections sont déjà liées via departure_inspection_id et arrival_inspection_id
  UPDATE missions
  SET 
    status = 'completed',
    updated_at = now()
  WHERE id = p_mission_id;

  RETURN jsonb_build_object(
    'success', true,
    'mission_id', p_mission_id,
    'message', 'Mission clôturée avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Donner les droits d'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION close_mission_after_arrival(uuid) TO authenticated;

-- Test rapide (remplace l'UUID par une vraie mission)
-- SELECT close_mission_after_arrival('ton-uuid-mission-ici');
