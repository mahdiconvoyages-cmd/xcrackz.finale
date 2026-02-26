-- ============================================================
-- RPC get_dashboard_complete
-- Retourne TOUTES les données du dashboard en UN SEUL appel
-- Au lieu de 7 requêtes séparées (profile + subscription + stats + 4 activités)
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_complete(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_profile JSONB;
  v_subscription JSONB;
  v_stats JSONB;
  v_recent_missions JSONB;
  v_recent_contacts JSONB;
  v_recent_inspections JSONB;
  v_recent_invoices JSONB;
  v_total_missions INT;
  v_active_missions INT;
  v_completed_missions INT;
  v_total_contacts INT;
  v_completion_rate NUMERIC;
BEGIN
  -- 1. Profile
  SELECT jsonb_build_object(
    'first_name', COALESCE(p.first_name, ''),
    'last_name', COALESCE(p.last_name, ''),
    'credits', COALESCE(p.credits, 0)
  ) INTO v_profile
  FROM profiles p
  WHERE p.id = p_user_id;

  IF v_profile IS NULL THEN
    v_profile := '{"first_name":"","last_name":"","credits":0}'::JSONB;
  END IF;

  -- 2. Subscription (active)
  SELECT jsonb_build_object(
    'plan', COALESCE(s.plan, 'free'),
    'status', COALESCE(s.status, 'active'),
    'current_period_end', s.current_period_end,
    'auto_renew', COALESCE(s.auto_renew, false)
  ) INTO v_subscription
  FROM subscriptions s
  WHERE s.user_id = p_user_id AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- 3. Stats (missions)
  SELECT COUNT(*) INTO v_total_missions
  FROM missions m
  WHERE m.user_id = p_user_id OR m.assigned_user_id = p_user_id;

  SELECT COUNT(*) INTO v_active_missions
  FROM missions m
  WHERE (m.user_id = p_user_id OR m.assigned_user_id = p_user_id)
    AND m.status IN ('pending', 'assigned', 'in_progress');

  SELECT COUNT(*) INTO v_completed_missions
  FROM missions m
  WHERE (m.user_id = p_user_id OR m.assigned_user_id = p_user_id)
    AND m.status = 'completed';

  SELECT COUNT(*) INTO v_total_contacts
  FROM clients c
  WHERE c.user_id = p_user_id;

  IF v_total_missions > 0 THEN
    v_completion_rate := ROUND((v_completed_missions::NUMERIC / v_total_missions) * 100, 1);
  ELSE
    v_completion_rate := 0;
  END IF;

  v_stats := jsonb_build_object(
    'total_missions', v_total_missions,
    'active_missions', v_active_missions,
    'completed_missions', v_completed_missions,
    'total_contacts', v_total_contacts,
    'completion_rate', v_completion_rate
  );

  -- 4. Recent missions (last 5)
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::JSONB), '[]'::JSONB)
  INTO v_recent_missions
  FROM (
    SELECT m.id, m.reference, m.status, m.pickup_city, m.delivery_city,
           m.created_at, m.updated_at
    FROM missions m
    WHERE m.user_id = p_user_id OR m.assigned_user_id = p_user_id
    ORDER BY COALESCE(m.updated_at, m.created_at) DESC
    LIMIT 5
  ) sub;

  -- 5. Recent contacts (last 3)
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::JSONB), '[]'::JSONB)
  INTO v_recent_contacts
  FROM (
    SELECT c.id, c.name, c.is_company AS type, c.created_at
    FROM clients c
    WHERE c.user_id = p_user_id
    ORDER BY c.created_at DESC
    LIMIT 3
  ) sub;

  -- 6. Recent inspections (last 3)
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::JSONB), '[]'::JSONB)
  INTO v_recent_inspections
  FROM (
    SELECT vi.id, vi.inspection_type AS type,
           vi.vehicle_brand, vi.vehicle_model, vi.created_at
    FROM vehicle_inspections vi
    WHERE vi.inspector_id = p_user_id
    ORDER BY vi.created_at DESC
    LIMIT 3
  ) sub;

  -- 7. Recent invoices (last 3)
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::JSONB), '[]'::JSONB)
  INTO v_recent_invoices
  FROM (
    SELECT i.id, i.invoice_number, i.client_name, i.status, i.total,
           i.created_at, i.updated_at
    FROM invoices i
    WHERE i.user_id = p_user_id
    ORDER BY COALESCE(i.updated_at, i.created_at) DESC
    LIMIT 3
  ) sub;

  -- Build final result
  v_result := jsonb_build_object(
    'profile', v_profile,
    'subscription', v_subscription,
    'stats', v_stats,
    'recent_missions', v_recent_missions,
    'recent_contacts', v_recent_contacts,
    'recent_inspections', v_recent_inspections,
    'recent_invoices', v_recent_invoices
  );

  RETURN v_result;
END;
$$;
