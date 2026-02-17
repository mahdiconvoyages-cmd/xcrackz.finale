-- ============================================
-- Server-side Dashboard Stats RPC
-- Replaces 5 client-side queries + JS aggregation
-- with a single efficient database function
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_result JSON;
  v_now TIMESTAMPTZ := NOW();
  v_start_of_month TIMESTAMPTZ;
  v_start_of_week TIMESTAMPTZ;
  v_start_of_today TIMESTAMPTZ;
BEGIN
  v_start_of_month := date_trunc('month', v_now);
  v_start_of_week := date_trunc('week', v_now);
  v_start_of_today := date_trunc('day', v_now);

  SELECT json_build_object(
    -- Mission counts
    'total_missions', COALESCE((SELECT COUNT(*) FROM missions WHERE user_id = p_user_id), 0),
    'active_missions', COALESCE((SELECT COUNT(*) FROM missions WHERE user_id = p_user_id AND status = 'in_progress'), 0),
    'completed_missions', COALESCE((SELECT COUNT(*) FROM missions WHERE user_id = p_user_id AND status = 'completed'), 0),
    'cancelled_missions', COALESCE((SELECT COUNT(*) FROM missions WHERE user_id = p_user_id AND status = 'cancelled'), 0),
    'pending_missions', COALESCE((SELECT COUNT(*) FROM missions WHERE user_id = p_user_id AND status = 'pending'), 0),
    'missions_this_week', COALESCE((SELECT COUNT(*) FROM missions WHERE user_id = p_user_id AND created_at >= v_start_of_week), 0),
    'missions_today', COALESCE((SELECT COUNT(*) FROM missions WHERE user_id = p_user_id AND created_at >= v_start_of_today), 0),

    -- Revenue
    'total_revenue', COALESCE((
      SELECT SUM(COALESCE(company_commission, 0) + COALESCE(bonus_amount, 0))
      FROM missions WHERE user_id = p_user_id AND status = 'completed'
    ), 0),
    'monthly_revenue', COALESCE((
      SELECT SUM(COALESCE(company_commission, 0) + COALESCE(bonus_amount, 0))
      FROM missions WHERE user_id = p_user_id AND status = 'completed' AND created_at >= v_start_of_month
    ), 0),
    'weekly_revenue', COALESCE((
      SELECT SUM(COALESCE(company_commission, 0) + COALESCE(bonus_amount, 0))
      FROM missions WHERE user_id = p_user_id AND status = 'completed' AND created_at >= v_start_of_week
    ), 0),
    'average_mission_price', COALESCE((
      SELECT AVG(COALESCE(company_commission, 0) + COALESCE(bonus_amount, 0))
      FROM missions WHERE user_id = p_user_id AND status = 'completed'
    ), 0),

    -- Rates
    'completion_rate', CASE
      WHEN (SELECT COUNT(*) FROM missions WHERE user_id = p_user_id) > 0
      THEN ROUND((SELECT COUNT(*)::numeric FROM missions WHERE user_id = p_user_id AND status = 'completed') /
           (SELECT COUNT(*)::numeric FROM missions WHERE user_id = p_user_id) * 100, 1)
      ELSE 0 END,
    'cancelled_rate', CASE
      WHEN (SELECT COUNT(*) FROM missions WHERE user_id = p_user_id) > 0
      THEN ROUND((SELECT COUNT(*)::numeric FROM missions WHERE user_id = p_user_id AND status = 'cancelled') /
           (SELECT COUNT(*)::numeric FROM missions WHERE user_id = p_user_id) * 100, 1)
      ELSE 0 END,

    -- Distance & delivery time
    'total_distance', COALESCE((SELECT SUM(COALESCE(distance_km, 0)) FROM missions WHERE user_id = p_user_id), 0),
    'average_delivery_time_hours', COALESCE((
      SELECT AVG(EXTRACT(EPOCH FROM (delivery_date - pickup_date)) / 3600)
      FROM missions WHERE user_id = p_user_id AND status = 'completed'
        AND pickup_date IS NOT NULL AND delivery_date IS NOT NULL
        AND delivery_date > pickup_date
    ), 0),

    -- Contacts
    'total_contacts', COALESCE((SELECT COUNT(*) FROM contacts WHERE user_id = p_user_id), 0),
    'total_drivers', COALESCE((SELECT COUNT(*) FROM contacts WHERE user_id = p_user_id AND is_driver = true), 0),
    'total_clients', COALESCE((SELECT COUNT(*) FROM contacts WHERE user_id = p_user_id AND type = 'customer'), 0),
    'top_rated_contacts', COALESCE((SELECT COUNT(*) FROM contacts WHERE user_id = p_user_id AND rating_average >= 4), 0),

    -- Invoices
    'total_invoices', COALESCE((SELECT COUNT(*) FROM invoices WHERE user_id = p_user_id), 0),
    'paid_invoices', COALESCE((SELECT COUNT(*) FROM invoices WHERE user_id = p_user_id AND status = 'paid'), 0),
    'pending_invoices', COALESCE((SELECT COUNT(*) FROM invoices WHERE user_id = p_user_id AND status NOT IN ('paid', 'cancelled')), 0),

    -- Credits
    'total_credits', COALESCE((SELECT credits FROM profiles WHERE id = p_user_id), 0),

    -- Last 6 months chart data
    'monthly_chart', (
      SELECT json_agg(row_to_json(t) ORDER BY t.month_date)
      FROM (
        SELECT
          to_char(d.month_date, 'Mon') AS month,
          d.month_date,
          COALESCE((SELECT COUNT(*) FROM missions m WHERE m.user_id = p_user_id
            AND date_trunc('month', m.created_at) = d.month_date), 0) AS missions,
          COALESCE((SELECT SUM(COALESCE(m.company_commission, 0) + COALESCE(m.bonus_amount, 0))
            FROM missions m WHERE m.user_id = p_user_id AND m.status = 'completed'
            AND date_trunc('month', m.created_at) = d.month_date), 0) AS revenue
        FROM generate_series(
          date_trunc('month', v_now) - INTERVAL '5 months',
          date_trunc('month', v_now),
          INTERVAL '1 month'
        ) AS d(month_date)
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
