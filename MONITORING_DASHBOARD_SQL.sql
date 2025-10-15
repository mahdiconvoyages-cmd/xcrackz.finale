-- 📊 DASHBOARD MONITORING NAVIGATION GPS
-- À exécuter dans Supabase SQL Editor pour créer les vues de monitoring

-- ============================================
-- 1. VUE PRINCIPALE - QUOTA DU MOIS EN COURS
-- ============================================

-- Nettoyage préalable (si conflits)
DROP VIEW IF EXISTS navigation_current_month_dashboard CASCADE;
DROP VIEW IF EXISTS navigation_daily_stats CASCADE;
DROP VIEW IF EXISTS navigation_top_missions CASCADE;
DROP VIEW IF EXISTS navigation_hourly_patterns CASCADE;
DROP TABLE IF EXISTS navigation_alerts CASCADE;

CREATE OR REPLACE VIEW navigation_current_month_dashboard AS
SELECT 
  -- Métriques principales
  COUNT(*)::BIGINT as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active')::BIGINT as sessions_actives,
  COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as sessions_completees,
  COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as sessions_annulees,
  
  -- Cache et API
  COUNT(*) FILTER (WHERE from_cache = TRUE)::BIGINT as sessions_cache,
  COUNT(*) FILTER (WHERE from_cache = FALSE)::BIGINT as sessions_api,
  ROUND((COUNT(*) FILTER (WHERE from_cache = TRUE)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 1) as cache_hit_rate_percent,
  
  -- Distances
  ROUND(SUM(distance_meters) / 1000, 1) as distance_totale_km,
  ROUND(AVG(distance_meters) / 1000, 1) as distance_moyenne_km,
  ROUND(MIN(distance_meters) / 1000, 1) as distance_min_km,
  ROUND(MAX(distance_meters) / 1000, 1) as distance_max_km,
  
  -- Durées
  ROUND(SUM(estimated_duration_seconds) / 3600, 1) as duree_totale_heures,
  ROUND(AVG(estimated_duration_seconds) / 60, 1) as duree_moyenne_minutes,
  
  -- Quota Mapbox (25k free tier)
  COUNT(*) FILTER (WHERE from_cache = FALSE)::BIGINT as mapbox_quota_utilise,
  (25000 - COUNT(*) FILTER (WHERE from_cache = FALSE))::BIGINT as mapbox_quota_restant,
  ROUND((COUNT(*) FILTER (WHERE from_cache = FALSE)::NUMERIC / 25000 * 100), 2) as mapbox_quota_percent,
  
  -- Estimation coûts
  CASE 
    WHEN COUNT(*) FILTER (WHERE from_cache = FALSE) > 25000 
    THEN ROUND((COUNT(*) FILTER (WHERE from_cache = FALSE) - 25000) * 0.50, 2)
    ELSE 0 
  END as cout_additionnel_usd,
  
  -- Statut quota (pour alertes)
  CASE 
    WHEN COUNT(*) FILTER (WHERE from_cache = FALSE) >= 25000 THEN '🚨 CRITIQUE - Quota dépassé'
    WHEN COUNT(*) FILTER (WHERE from_cache = FALSE) >= 24000 THEN '⚠️ ALERTE - 96% utilisé'
    WHEN COUNT(*) FILTER (WHERE from_cache = FALSE) >= 20000 THEN '⚠️ WARNING - 80% utilisé'
    WHEN COUNT(*) FILTER (WHERE from_cache = FALSE) >= 15000 THEN '✅ OK - 60% utilisé'
    ELSE '✅ OK - Sous 60%'
  END as statut_quota,
  
  -- Période
  DATE_TRUNC('month', NOW())::DATE as mois,
  NOW()::DATE as derniere_mise_a_jour
FROM navigation_sessions
WHERE created_at >= DATE_TRUNC('month', NOW());

COMMENT ON VIEW navigation_current_month_dashboard IS 'Dashboard temps réel - Quota et métriques du mois en cours';


-- ============================================
-- 2. VUE JOURNALIÈRE - SUIVI PAR JOUR
-- ============================================

CREATE OR REPLACE VIEW navigation_daily_stats AS
SELECT 
  DATE(created_at) as jour,
  DATE_PART('dow', created_at) as jour_semaine, -- 0=dimanche, 6=samedi
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE from_cache = TRUE) as sessions_cache,
  COUNT(*) FILTER (WHERE from_cache = FALSE) as sessions_api,
  ROUND((COUNT(*) FILTER (WHERE from_cache = TRUE)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 1) as cache_hit_rate,
  COUNT(*) FILTER (WHERE status = 'completed') as completees,
  COUNT(*) FILTER (WHERE status = 'cancelled') as annulees,
  ROUND(AVG(distance_meters) / 1000, 1) as distance_moyenne_km,
  ROUND(AVG(estimated_duration_seconds) / 60, 1) as duree_moyenne_min,
  ROUND(SUM(distance_meters) / 1000, 1) as distance_totale_km
FROM navigation_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), DATE_PART('dow', created_at)
ORDER BY jour DESC;

COMMENT ON VIEW navigation_daily_stats IS 'Statistiques journalières - 30 derniers jours';


-- ============================================
-- 3. VUE TOP MISSIONS - PLUS NAVIGÉES
-- ============================================

CREATE OR REPLACE VIEW navigation_top_missions AS
SELECT 
  m.id,
  m.reference,
  m.status,
  m.pickup_address,
  m.delivery_address,
  COUNT(ns.id) as total_navigations,
  COUNT(*) FILTER (WHERE ns.status = 'completed') as navigations_completees,
  COUNT(*) FILTER (WHERE ns.from_cache = TRUE) as navigations_cache,
  ROUND(AVG(ns.distance_meters) / 1000, 1) as distance_moyenne_km,
  ROUND(AVG(ns.estimated_duration_seconds) / 60, 1) as duree_moyenne_min,
  MAX(ns.created_at) as derniere_navigation,
  ROUND((COUNT(*) FILTER (WHERE ns.status = 'completed')::NUMERIC / NULLIF(COUNT(ns.id), 0) * 100), 1) as taux_completion
FROM missions m
INNER JOIN navigation_sessions ns ON ns.mission_id = m.id
WHERE ns.created_at >= NOW() - INTERVAL '30 days'
GROUP BY m.id, m.reference, m.status, m.pickup_address, m.delivery_address
HAVING COUNT(ns.id) > 0
ORDER BY total_navigations DESC
LIMIT 20;

COMMENT ON VIEW navigation_top_missions IS 'Top 20 missions les plus naviguées - 30 derniers jours';


-- ============================================
-- 4. VUE HORAIRE - PATTERNS D'UTILISATION
-- ============================================

CREATE OR REPLACE VIEW navigation_hourly_patterns AS
SELECT 
  DATE_PART('hour', created_at)::INTEGER as heure,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE from_cache = FALSE) as sessions_api,
  ROUND(AVG(distance_meters) / 1000, 1) as distance_moyenne_km,
  COUNT(DISTINCT DATE(created_at)) as jours_concernes
FROM navigation_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_PART('hour', created_at)
ORDER BY heure;

COMMENT ON VIEW navigation_hourly_patterns IS 'Patterns d''utilisation par heure - 30 derniers jours';


-- ============================================
-- 5. VUE ALERTE - SESSIONS À SURVEILLER
-- ============================================

-- Drop si existe en tant que table (pour recréer en vue)
DROP TABLE IF EXISTS navigation_alerts CASCADE;

CREATE OR REPLACE VIEW navigation_alerts AS
SELECT 
  ns.id,
  ns.mission_id,
  m.reference as mission_reference,
  ns.status,
  ns.started_at,
  ns.ended_at,
  EXTRACT(EPOCH FROM (COALESCE(ns.ended_at, NOW()) - ns.started_at)) / 60 as duree_minutes,
  ns.distance_meters / 1000 as distance_km,
  ns.percent_complete,
  -- Alertes
  CASE 
    WHEN ns.status = 'active' AND ns.started_at < NOW() - INTERVAL '2 hours' 
      THEN '⚠️ Session active > 2h'
    WHEN ns.status = 'cancelled' 
      THEN '❌ Navigation annulée'
    WHEN ns.status = 'completed' AND ns.percent_complete < 80 
      THEN '⚠️ Complétée mais < 80%'
    ELSE '✅ OK'
  END as alerte,
  ns.from_cache
FROM navigation_sessions ns
INNER JOIN missions m ON m.id = ns.mission_id
WHERE 
  ns.created_at >= NOW() - INTERVAL '7 days'
  AND (
    (ns.status = 'active' AND ns.started_at < NOW() - INTERVAL '2 hours')
    OR ns.status = 'cancelled'
    OR (ns.status = 'completed' AND ns.percent_complete < 80)
  )
ORDER BY ns.started_at DESC;

COMMENT ON VIEW navigation_alerts IS 'Sessions nécessitant attention - 7 derniers jours';


-- ============================================
-- 6. FONCTION - PROJECTION QUOTA FIN DE MOIS
-- ============================================

CREATE OR REPLACE FUNCTION get_navigation_quota_projection()
RETURNS TABLE (
  jour_actuel INTEGER,
  jours_restants INTEGER,
  quota_utilise BIGINT,
  quota_restant BIGINT,
  moyenne_par_jour NUMERIC,
  projection_fin_mois NUMERIC,
  depassement_prevu BOOLEAN,
  sessions_max_par_jour NUMERIC,
  statut TEXT
) AS $$
DECLARE
  current_day INTEGER;
  days_in_month INTEGER;
  days_remaining INTEGER;
  used_quota BIGINT;
  avg_daily NUMERIC;
  projected NUMERIC;
BEGIN
  -- Calculer le jour actuel et jours restants
  current_day := DATE_PART('day', NOW())::INTEGER;
  days_in_month := DATE_PART('day', (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'))::INTEGER;
  days_remaining := days_in_month - current_day;
  
  -- Quota utilisé ce mois
  SELECT COUNT(*) FILTER (WHERE from_cache = FALSE)
  INTO used_quota
  FROM navigation_sessions
  WHERE created_at >= DATE_TRUNC('month', NOW());
  
  -- Moyenne quotidienne
  avg_daily := CASE 
    WHEN current_day > 0 THEN used_quota::NUMERIC / current_day
    ELSE 0
  END;
  
  -- Projection fin de mois
  projected := used_quota + (avg_daily * days_remaining);
  
  RETURN QUERY
  SELECT 
    current_day,
    days_remaining,
    used_quota,
    (25000 - used_quota)::BIGINT,
    ROUND(avg_daily, 1),
    ROUND(projected, 0),
    projected > 25000,
    ROUND((25000 - used_quota)::NUMERIC / NULLIF(days_remaining, 0), 1),
    CASE 
      WHEN projected > 25000 THEN '🚨 DÉPASSEMENT PRÉVU'
      WHEN projected > 23000 THEN '⚠️ RISQUE ÉLEVÉ'
      WHEN projected > 20000 THEN '⚠️ SURVEILLER'
      ELSE '✅ ON TRACK'
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_navigation_quota_projection IS 'Projection quota fin de mois basée sur moyenne actuelle';


-- ============================================
-- 7. REQUÊTES DASHBOARD PRÊTES À L'EMPLOI
-- ============================================

-- 📊 DASHBOARD PRINCIPAL
SELECT * FROM navigation_current_month_dashboard;

-- 📈 TENDANCE 30 JOURS
SELECT 
  jour,
  total_sessions,
  sessions_api,
  cache_hit_rate || '%' as "Cache Hit Rate",
  distance_totale_km || ' km' as "Distance Totale"
FROM navigation_daily_stats
ORDER BY jour DESC
LIMIT 30;

-- 🎯 PROJECTION FIN DE MOIS
SELECT 
  'Jour ' || jour_actuel || '/' || (jour_actuel + jours_restants) as "Progression Mois",
  quota_utilise || ' / 25000' as "Quota Utilisé",
  ROUND(quota_utilise::NUMERIC / 25000 * 100, 1) || '%' as "Pourcentage",
  projection_fin_mois || ' sessions' as "Projection Fin Mois",
  CASE 
    WHEN depassement_prevu THEN '🚨 ' || (projection_fin_mois - 25000) || ' sessions de dépassement'
    ELSE '✅ Dans les limites'
  END as "Alerte",
  'Max ' || sessions_max_par_jour || ' sessions/jour' as "Limite Quotidienne"
FROM get_navigation_quota_projection();

-- 🏆 TOP 10 MISSIONS
SELECT 
  reference as "Référence",
  total_navigations as "Navigations",
  taux_completion || '%' as "Taux Complétion",
  distance_moyenne_km || ' km' as "Distance Moy",
  duree_moyenne_min || ' min' as "Durée Moy"
FROM navigation_top_missions
LIMIT 10;

-- ⏰ HEURES DE POINTE
SELECT 
  LPAD(heure::TEXT, 2, '0') || ':00' as "Heure",
  total_sessions as "Sessions",
  sessions_api as "API Calls",
  distance_moyenne_km || ' km' as "Distance Moy"
FROM navigation_hourly_patterns
WHERE total_sessions > 0
ORDER BY total_sessions DESC
LIMIT 10;

-- 🚨 ALERTES ACTIVES
SELECT 
  mission_reference as "Mission",
  alerte as "Alerte",
  ROUND(duree_minutes, 0) || ' min' as "Durée",
  ROUND(distance_km, 1) || ' km' as "Distance",
  status as "Status"
FROM navigation_alerts
ORDER BY started_at DESC;

-- 💾 CACHE EFFICIENCY (par jour semaine)
SELECT 
  CASE jour_semaine
    WHEN 0 THEN 'Dimanche'
    WHEN 1 THEN 'Lundi'
    WHEN 2 THEN 'Mardi'
    WHEN 3 THEN 'Mercredi'
    WHEN 4 THEN 'Jeudi'
    WHEN 5 THEN 'Vendredi'
    WHEN 6 THEN 'Samedi'
  END as "Jour",
  SUM(total_sessions) as "Total Sessions",
  SUM(sessions_cache) as "Cache Hits",
  ROUND(AVG(cache_hit_rate), 1) || '%' as "Cache Hit Rate Moy"
FROM navigation_daily_stats
GROUP BY jour_semaine
ORDER BY jour_semaine;


-- ============================================
-- 8. ALERTES AUTOMATIQUES (à configurer)
-- ============================================

-- À ajouter dans une Edge Function Supabase pour alertes email/Slack

-- Alerte 80% quota
-- SELECT * FROM navigation_current_month_dashboard WHERE mapbox_quota_percent >= 80;

-- Alerte 96% quota
-- SELECT * FROM navigation_current_month_dashboard WHERE mapbox_quota_percent >= 96;

-- Alerte dépassement prévu
-- SELECT * FROM get_navigation_quota_projection() WHERE depassement_prevu = TRUE;


-- ============================================
-- 9. PERMISSIONS RLS (Row Level Security)
-- ============================================

-- Grant select sur les vues pour les utilisateurs authentifiés
GRANT SELECT ON navigation_current_month_dashboard TO authenticated;
GRANT SELECT ON navigation_daily_stats TO authenticated;
GRANT SELECT ON navigation_top_missions TO authenticated;
GRANT SELECT ON navigation_hourly_patterns TO authenticated;
GRANT SELECT ON navigation_alerts TO authenticated;

-- Grant execute sur la fonction
GRANT EXECUTE ON FUNCTION get_navigation_quota_projection() TO authenticated;


-- ============================================
-- 10. VÉRIFICATION INSTALLATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Dashboard de monitoring installé avec succès !';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Vues créées:';
  RAISE NOTICE '  - navigation_current_month_dashboard';
  RAISE NOTICE '  - navigation_daily_stats';
  RAISE NOTICE '  - navigation_top_missions';
  RAISE NOTICE '  - navigation_hourly_patterns';
  RAISE NOTICE '  - navigation_alerts';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Fonction créée:';
  RAISE NOTICE '  - get_navigation_quota_projection()';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Testez avec: SELECT * FROM navigation_current_month_dashboard;';
END $$;
