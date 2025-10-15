-- =====================================================
-- MIGRATION: TABLES NOTIFICATIONS PUSH (ONESIGNAL)
-- =====================================================
-- Description: Création des tables pour le tracking des notifications
--              OneSignal et la gestion des devices utilisateurs
-- Date: 2025-02-01
-- =====================================================

-- Table: user_devices
-- Description: Stocke les Player IDs OneSignal associés aux utilisateurs
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL UNIQUE,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  device_model TEXT,
  os_version TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_player ON user_devices(player_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_active ON user_devices(last_active DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_devices_updated_at ON user_devices;
CREATE TRIGGER trigger_update_user_devices_updated_at
  BEFORE UPDATE ON user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_user_devices_updated_at();

-- =====================================================

-- Table: notification_logs
-- Description: Logs des notifications envoyées, reçues et cliquées
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('sent', 'received', 'clicked')),
  type TEXT, -- NotificationType enum
  title TEXT,
  message TEXT,
  data JSONB DEFAULT '{}',
  platform TEXT,
  channel TEXT, -- missions, urgent, updates, navigation
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notif ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_action ON notification_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);

-- =====================================================

-- RLS (Row Level Security)
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Policies: user_devices
DROP POLICY IF EXISTS "Users can view their own devices" ON user_devices;
CREATE POLICY "Users can view their own devices"
  ON user_devices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own devices" ON user_devices;
CREATE POLICY "Users can insert their own devices"
  ON user_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own devices" ON user_devices;
CREATE POLICY "Users can update their own devices"
  ON user_devices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all devices" ON user_devices;
CREATE POLICY "Admins can view all devices"
  ON user_devices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policies: notification_logs
DROP POLICY IF EXISTS "Users can view their own logs" ON notification_logs;
CREATE POLICY "Users can view their own logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own logs" ON notification_logs;
CREATE POLICY "Users can insert their own logs"
  ON notification_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all logs" ON notification_logs;
CREATE POLICY "Admins can view all logs"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- =====================================================

-- Vue: notification_stats_by_user
-- Description: Statistiques de notifications par utilisateur (7 derniers jours)
CREATE OR REPLACE VIEW notification_stats_by_user AS
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE action = 'sent') as total_sent,
  COUNT(*) FILTER (WHERE action = 'received') as total_received,
  COUNT(*) FILTER (WHERE action = 'clicked') as total_clicked,
  ROUND(
    COUNT(*) FILTER (WHERE action = 'clicked')::NUMERIC / 
    NULLIF(COUNT(*) FILTER (WHERE action = 'received'), 0) * 100, 
    1
  ) as open_rate_percent,
  MAX(created_at) as last_notification
FROM notification_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id;

-- Vue: notification_stats_by_type
-- Description: Statistiques de notifications par type (30 derniers jours)
CREATE OR REPLACE VIEW notification_stats_by_type AS
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE action = 'sent') as sent,
  COUNT(*) FILTER (WHERE action = 'received') as received,
  COUNT(*) FILTER (WHERE action = 'clicked') as clicked,
  ROUND(
    COUNT(*) FILTER (WHERE action = 'clicked')::NUMERIC / 
    NULLIF(COUNT(*) FILTER (WHERE action = 'received'), 0) * 100, 
    1
  ) as click_rate_percent,
  COUNT(*) FILTER (WHERE success = false) as errors
FROM notification_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY total DESC;

-- Vue: active_devices
-- Description: Devices actifs (actifs dans les 7 derniers jours)
CREATE OR REPLACE VIEW active_devices AS
SELECT 
  platform,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_devices,
  MAX(last_active) as most_recent_activity,
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - last_active)) / 3600), 1) as avg_hours_since_active
FROM user_devices
WHERE last_active >= NOW() - INTERVAL '7 days'
GROUP BY platform;

-- Vue: notification_timeline_hourly
-- Description: Timeline des notifications par heure (24 dernières heures)
CREATE OR REPLACE VIEW notification_timeline_hourly AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  action,
  COUNT(*) as total,
  COUNT(DISTINCT user_id) as unique_users
FROM notification_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), action
ORDER BY hour DESC, action;

-- =====================================================

-- Fonction: get_notification_summary
-- Description: Obtient un résumé complet des notifications
CREATE OR REPLACE FUNCTION get_notification_summary(
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_sent BIGINT,
  total_received BIGINT,
  total_clicked BIGINT,
  overall_open_rate NUMERIC,
  active_users BIGINT,
  active_devices BIGINT,
  most_common_type TEXT,
  most_common_channel TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE action = 'sent') as total_sent,
    COUNT(*) FILTER (WHERE action = 'received') as total_received,
    COUNT(*) FILTER (WHERE action = 'clicked') as total_clicked,
    ROUND(
      COUNT(*) FILTER (WHERE action = 'clicked')::NUMERIC / 
      NULLIF(COUNT(*) FILTER (WHERE action = 'received'), 0) * 100, 
      1
    ) as overall_open_rate,
    COUNT(DISTINCT n.user_id) as active_users,
    (SELECT COUNT(*) FROM user_devices WHERE last_active >= NOW() - INTERVAL '1 day' * days_back) as active_devices,
    (
      SELECT type 
      FROM notification_logs 
      WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
      GROUP BY type 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_common_type,
    (
      SELECT channel 
      FROM notification_logs 
      WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
      GROUP BY channel 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_common_channel
  FROM notification_logs n
  WHERE n.created_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- =====================================================

-- Commentaires
COMMENT ON TABLE user_devices IS 'Stocke les Player IDs OneSignal associés aux utilisateurs';
COMMENT ON TABLE notification_logs IS 'Logs des notifications envoyées, reçues et cliquées';
COMMENT ON VIEW notification_stats_by_user IS 'Statistiques de notifications par utilisateur (7 derniers jours)';
COMMENT ON VIEW notification_stats_by_type IS 'Statistiques de notifications par type (30 derniers jours)';
COMMENT ON VIEW active_devices IS 'Devices actifs dans les 7 derniers jours';
COMMENT ON VIEW notification_timeline_hourly IS 'Timeline des notifications par heure (24 dernières heures)';
COMMENT ON FUNCTION get_notification_summary IS 'Résumé complet des statistiques de notifications';

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
