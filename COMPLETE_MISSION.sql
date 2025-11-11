-- ================================================
-- RPC: complete_mission(p_mission_id uuid)
-- Objectif: Marquer une mission comme terminée en sécurité (contourner RLS)
-- - Met status='completed'
-- - Met completed_at=NOW() si la colonne existe
-- - Vérifie l'existence de la mission
-- ================================================

DROP FUNCTION IF EXISTS complete_mission(UUID);
CREATE OR REPLACE FUNCTION complete_mission(
  p_mission_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT TRUE INTO v_exists FROM public.missions WHERE id = p_mission_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Mission introuvable');
  END IF;

  -- Tenter de mettre à jour status + completed_at si présent
  BEGIN
    UPDATE public.missions
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = p_mission_id;
  EXCEPTION WHEN undefined_column THEN
    -- completed_at n'existe pas, faire une mise à jour minimale
    UPDATE public.missions
    SET status = 'completed'
    WHERE id = p_mission_id;
  END;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_mission(UUID) TO authenticated;