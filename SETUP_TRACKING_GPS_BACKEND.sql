-- =============================================================================
-- TRACKING GPS PROFESSIONNEL - BACKEND COMPLET
-- =============================================================================
-- Description: Architecture complète pour tracking GPS temps réel avec:
--   - Position live (1 enregistrement par mission)
--   - Historique (snapshots toutes les 5 minutes)
--   - Liens publics sécurisés pour clients
--   - Nettoyage automatique
--   - Optimisations performance
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1: CRÉER LES TABLES
-- =============================================================================

-- Table 1: Position en temps réel (optimisée pour UPDATE)
-- ========================================================
CREATE TABLE IF NOT EXISTS mission_tracking_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Données GPS
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,        -- Précision en mètres
  altitude DOUBLE PRECISION,
  bearing DOUBLE PRECISION,         -- Direction 0-360°
  speed DOUBLE PRECISION,           -- Vitesse en m/s
  
  -- Métadonnées
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  battery_level INTEGER,            -- Niveau batterie 0-100
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte: 1 seul tracking actif par mission+user
  UNIQUE(mission_id, user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_tracking_live_mission 
ON mission_tracking_live(mission_id, last_update DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_live_active 
ON mission_tracking_live(is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tracking_live_user 
ON mission_tracking_live(user_id);

COMMENT ON TABLE mission_tracking_live IS 'Position GPS en temps réel - UN seul enregistrement par mission (UPDATE, pas INSERT)';


-- Table 2: Historique de tracking (archives)
-- ===========================================
CREATE TABLE IF NOT EXISTS mission_tracking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Données GPS
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  bearing DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  
  -- Timestamp
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour reconstitution rapide du trajet
CREATE INDEX IF NOT EXISTS idx_tracking_history_mission_time 
ON mission_tracking_history(mission_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_history_mission 
ON mission_tracking_history(mission_id);

COMMENT ON TABLE mission_tracking_history IS 'Historique GPS - Snapshots toutes les 5 minutes - Nettoyage auto après 7 jours';


-- Table 3: Liens publics sécurisés
-- =================================
CREATE TABLE IF NOT EXISTS public_tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL UNIQUE REFERENCES missions(id) ON DELETE CASCADE,
  
  -- Token public unique (impossible à deviner)
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  -- Sécurité
  is_active BOOLEAN DEFAULT true,
  max_accesses INTEGER DEFAULT 1000  -- Rate limiting
);

-- Index pour lookup rapide
CREATE INDEX IF NOT EXISTS idx_tracking_links_token 
ON public_tracking_links(token) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tracking_links_mission 
ON public_tracking_links(mission_id);

CREATE INDEX IF NOT EXISTS idx_tracking_links_expiry 
ON public_tracking_links(expires_at) 
WHERE is_active = true;

COMMENT ON TABLE public_tracking_links IS 'Liens publics sécurisés pour suivi client - Expiration auto 48h après mission';


-- =============================================================================
-- ÉTAPE 2: ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- mission_tracking_live
-- =====================
ALTER TABLE mission_tracking_live ENABLE ROW LEVEL SECURITY;

-- Les chauffeurs peuvent UPDATE leur propre position
DROP POLICY IF EXISTS "Users can update own tracking" ON mission_tracking_live;
CREATE POLICY "Users can update own tracking"
ON mission_tracking_live FOR UPDATE
USING (auth.uid() = user_id);

-- Les chauffeurs peuvent INSERT leur tracking
DROP POLICY IF EXISTS "Users can insert own tracking" ON mission_tracking_live;
CREATE POLICY "Users can insert own tracking"
ON mission_tracking_live FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent voir le tracking de leurs missions
DROP POLICY IF EXISTS "Users can view tracking of their missions" ON mission_tracking_live;
CREATE POLICY "Users can view tracking of their missions"
ON mission_tracking_live FOR SELECT
USING (
  mission_id IN (
    SELECT id FROM missions 
    WHERE user_id = auth.uid() OR assigned_user_id = auth.uid()
  )
);


-- mission_tracking_history
-- ========================
ALTER TABLE mission_tracking_history ENABLE ROW LEVEL SECURITY;

-- Les chauffeurs peuvent INSERT dans l'historique
DROP POLICY IF EXISTS "Users can insert own tracking history" ON mission_tracking_history;
CREATE POLICY "Users can insert own tracking history"
ON mission_tracking_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent voir l'historique de leurs missions
DROP POLICY IF EXISTS "Users can view history of their missions" ON mission_tracking_history;
CREATE POLICY "Users can view history of their missions"
ON mission_tracking_history FOR SELECT
USING (
  mission_id IN (
    SELECT id FROM missions 
    WHERE user_id = auth.uid() OR assigned_user_id = auth.uid()
  )
);


-- public_tracking_links (PUBLIC - pas d'authentification)
-- ========================================================
ALTER TABLE public_tracking_links ENABLE ROW LEVEL SECURITY;

-- N'importe qui peut voir un lien actif (pour la page publique)
DROP POLICY IF EXISTS "Anyone can view active tracking links" ON public_tracking_links;
CREATE POLICY "Anyone can view active tracking links"
ON public_tracking_links FOR SELECT
USING (is_active = true AND expires_at > NOW());

-- Seuls les créateurs de missions peuvent créer des liens
DROP POLICY IF EXISTS "Mission owners can create tracking links" ON public_tracking_links;
CREATE POLICY "Mission owners can create tracking links"
ON public_tracking_links FOR INSERT
WITH CHECK (
  mission_id IN (
    SELECT id FROM missions WHERE user_id = auth.uid()
  )
);

-- Seuls les créateurs peuvent mettre à jour les liens
DROP POLICY IF EXISTS "Mission owners can update tracking links" ON public_tracking_links;
CREATE POLICY "Mission owners can update tracking links"
ON public_tracking_links FOR UPDATE
USING (
  mission_id IN (
    SELECT id FROM missions WHERE user_id = auth.uid()
  )
);


-- =============================================================================
-- ÉTAPE 3: FONCTIONS UTILITAIRES
-- =============================================================================

-- Fonction: Générer un lien public pour une mission
-- ==================================================
CREATE OR REPLACE FUNCTION generate_public_tracking_link(p_mission_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_mission_end TIMESTAMPTZ;
BEGIN
  -- Récupérer date de fin de mission
  SELECT delivery_date INTO v_mission_end
  FROM missions
  WHERE id = p_mission_id;
  
  -- Si pas de date de fin, expiration dans 7 jours
  IF v_mission_end IS NULL THEN
    v_mission_end := NOW() + INTERVAL '7 days';
  END IF;
  
  -- Créer ou réactiver le lien (UPSERT)
  INSERT INTO public_tracking_links (mission_id, expires_at)
  VALUES (p_mission_id, v_mission_end + INTERVAL '48 hours')
  ON CONFLICT (mission_id) 
  DO UPDATE SET 
    is_active = true,
    expires_at = EXCLUDED.expires_at,
    access_count = 0  -- Reset counter
  RETURNING token INTO v_token;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_public_tracking_link IS 'Génère un lien public sécurisé pour une mission - Expiration 48h après fin mission';


-- Fonction: Nettoyage automatique des positions inactives
-- ========================================================
CREATE OR REPLACE FUNCTION cleanup_inactive_tracking()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Désactiver positions inactives depuis > 2 heures
  UPDATE mission_tracking_live
  SET is_active = false
  WHERE last_update < NOW() - INTERVAL '2 hours'
  AND is_active = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RAISE NOTICE '✅ % positions désactivées (inactives > 2h)', v_count;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- Fonction: Nettoyage automatique de l'historique ancien
-- =======================================================
CREATE OR REPLACE FUNCTION cleanup_old_tracking_history()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Supprimer historique > 7 jours
  DELETE FROM mission_tracking_history
  WHERE recorded_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RAISE NOTICE '✅ % enregistrements historiques supprimés (> 7 jours)', v_count;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- Fonction: Nettoyage des liens expirés
-- ======================================
CREATE OR REPLACE FUNCTION cleanup_expired_tracking_links()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Désactiver liens expirés
  UPDATE public_tracking_links
  SET is_active = false
  WHERE expires_at < NOW() 
  AND is_active = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RAISE NOTICE '✅ % liens expirés désactivés', v_count;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- Fonction: Nettoyage global quotidien
-- =====================================
CREATE OR REPLACE FUNCTION daily_tracking_cleanup()
RETURNS TABLE(
  inactive_count INTEGER,
  history_count INTEGER,
  links_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cleanup_inactive_tracking(),
    cleanup_old_tracking_history(),
    cleanup_expired_tracking_links();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION daily_tracking_cleanup IS 'Nettoyage quotidien complet - À planifier avec pg_cron';


-- Fonction: Obtenir dernière position d'une mission
-- ==================================================
CREATE OR REPLACE FUNCTION get_mission_last_position(p_mission_id UUID)
RETURNS TABLE(
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  bearing DOUBLE PRECISION,
  last_update TIMESTAMPTZ,
  battery_level INTEGER,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mtl.latitude,
    mtl.longitude,
    mtl.speed,
    mtl.bearing,
    mtl.last_update,
    mtl.battery_level,
    mtl.is_active
  FROM mission_tracking_live mtl
  WHERE mtl.mission_id = p_mission_id
  AND mtl.is_active = true
  ORDER BY mtl.last_update DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- ÉTAPE 4: TRIGGERS POUR AUTOMATION
-- =============================================================================

-- Trigger: Auto-update updated_at sur mission_tracking_live
-- ==========================================================
CREATE OR REPLACE FUNCTION update_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tracking_updated_at ON mission_tracking_live;
CREATE TRIGGER trigger_update_tracking_updated_at
  BEFORE UPDATE ON mission_tracking_live
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();


-- =============================================================================
-- ÉTAPE 5: VUES UTILES
-- =============================================================================

-- Vue: Missions avec tracking actif
-- ==================================
CREATE OR REPLACE VIEW missions_with_active_tracking AS
SELECT 
  m.id,
  m.reference,
  m.status,
  m.pickup_address,
  m.delivery_address,
  mtl.latitude,
  mtl.longitude,
  mtl.speed,
  mtl.bearing,
  mtl.last_update,
  mtl.battery_level,
  EXTRACT(EPOCH FROM (NOW() - mtl.last_update)) AS seconds_since_update,
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - mtl.last_update)) < 300 THEN 'live'
    WHEN EXTRACT(EPOCH FROM (NOW() - mtl.last_update)) < 600 THEN 'delayed'
    ELSE 'inactive'
  END AS tracking_status
FROM missions m
INNER JOIN mission_tracking_live mtl ON m.id = mtl.mission_id
WHERE mtl.is_active = true
ORDER BY mtl.last_update DESC;

COMMENT ON VIEW missions_with_active_tracking IS 'Vue des missions avec tracking GPS actif - Statut live/delayed/inactive';


-- Vue: Statistiques tracking
-- ===========================
CREATE OR REPLACE VIEW tracking_performance_stats AS
SELECT
  COUNT(DISTINCT mission_id) as active_missions,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_update))) as avg_delay_seconds,
  MAX(EXTRACT(EPOCH FROM (NOW() - last_update))) as max_delay_seconds,
  COUNT(*) FILTER (WHERE last_update > NOW() - INTERVAL '1 minute') as positions_last_minute,
  COUNT(*) FILTER (WHERE last_update > NOW() - INTERVAL '5 minutes') as positions_last_5_minutes,
  AVG(battery_level) FILTER (WHERE battery_level IS NOT NULL) as avg_battery_level,
  MIN(battery_level) FILTER (WHERE battery_level IS NOT NULL) as min_battery_level
FROM mission_tracking_live
WHERE is_active = true;

COMMENT ON VIEW tracking_performance_stats IS 'Statistiques de performance du tracking GPS en temps réel';


-- =============================================================================
-- ÉTAPE 6: ACTIVER REALTIME SUR LES TABLES
-- =============================================================================

-- Activer Realtime pour broadcast des positions
ALTER PUBLICATION supabase_realtime ADD TABLE mission_tracking_live;
ALTER PUBLICATION supabase_realtime ADD TABLE mission_tracking_history;


-- =============================================================================
-- ÉTAPE 7: DONNÉES DE TEST (OPTIONNEL)
-- =============================================================================

-- Fonction de test: Simuler tracking GPS
-- =======================================
CREATE OR REPLACE FUNCTION test_tracking_simulation(
  p_mission_id UUID,
  p_user_id UUID,
  p_start_lat DOUBLE PRECISION,
  p_start_lng DOUBLE PRECISION,
  p_end_lat DOUBLE PRECISION,
  p_end_lng DOUBLE PRECISION,
  p_steps INTEGER DEFAULT 10
)
RETURNS void AS $$
DECLARE
  v_lat_step DOUBLE PRECISION;
  v_lng_step DOUBLE PRECISION;
  v_current_lat DOUBLE PRECISION;
  v_current_lng DOUBLE PRECISION;
  v_step INTEGER;
BEGIN
  -- Calculer les incréments
  v_lat_step := (p_end_lat - p_start_lat) / p_steps;
  v_lng_step := (p_end_lng - p_start_lng) / p_steps;
  
  -- Simuler déplacement
  FOR v_step IN 0..p_steps LOOP
    v_current_lat := p_start_lat + (v_lat_step * v_step);
    v_current_lng := p_start_lng + (v_lng_step * v_step);
    
    -- Upsert position
    INSERT INTO mission_tracking_live (
      mission_id, 
      user_id, 
      latitude, 
      longitude, 
      speed, 
      bearing,
      battery_level,
      last_update,
      is_active
    )
    VALUES (
      p_mission_id,
      p_user_id,
      v_current_lat,
      v_current_lng,
      15.0 + (random() * 10),  -- Vitesse 15-25 m/s (~54-90 km/h)
      (random() * 360)::INTEGER,
      100 - (v_step * 5),  -- Batterie diminue
      NOW(),
      true
    )
    ON CONFLICT (mission_id, user_id)
    DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      speed = EXCLUDED.speed,
      bearing = EXCLUDED.bearing,
      battery_level = EXCLUDED.battery_level,
      last_update = EXCLUDED.last_update,
      is_active = EXCLUDED.is_active;
    
    -- Ajouter snapshot à l'historique
    INSERT INTO mission_tracking_history (
      mission_id, 
      user_id, 
      latitude, 
      longitude, 
      speed, 
      bearing,
      recorded_at
    )
    VALUES (
      p_mission_id,
      p_user_id,
      v_current_lat,
      v_current_lng,
      15.0 + (random() * 10),
      (random() * 360)::INTEGER,
      NOW()
    );
    
    -- Pause simulée
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  RAISE NOTICE '✅ Simulation terminée: % positions générées', p_steps + 1;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- ÉTAPE 8: VÉRIFICATIONS
-- =============================================================================

-- Vérifier que les tables existent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mission_tracking_live') THEN
    RAISE EXCEPTION '❌ Table mission_tracking_live non créée';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mission_tracking_history') THEN
    RAISE EXCEPTION '❌ Table mission_tracking_history non créée';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'public_tracking_links') THEN
    RAISE EXCEPTION '❌ Table public_tracking_links non créée';
  END IF;
  
  RAISE NOTICE '✅ Toutes les tables de tracking GPS créées avec succès';
END;
$$;

-- Vérifier les index
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('mission_tracking_live', 'mission_tracking_history', 'public_tracking_links')
ORDER BY tablename, indexname;

-- Vérifier les policies RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('mission_tracking_live', 'mission_tracking_history', 'public_tracking_links')
ORDER BY tablename, policyname;


-- =============================================================================
-- NOTES D'UTILISATION
-- =============================================================================

/*

UTILISATION MOBILE (Flutter):

1. Démarrer tracking:
   - INSERT ou UPSERT dans mission_tracking_live
   - Répéter UPDATE toutes les 10 secondes

2. Snapshot historique (toutes les 5 minutes):
   - INSERT dans mission_tracking_history

3. Générer lien public:
   - SELECT generate_public_tracking_link('mission-uuid');
   - Retourne un token à partager

UTILISATION WEB (Page publique):

1. Vérifier token:
   - SELECT * FROM public_tracking_links WHERE token = '...' AND is_active = true

2. Récupérer position:
   - SELECT * FROM mission_tracking_live WHERE mission_id = '...'

3. S'abonner Realtime:
   - Channel: mission:{id}:gps
   - Event: position_update

MAINTENANCE:

1. Nettoyage manuel:
   - SELECT daily_tracking_cleanup();

2. Voir statistiques:
   - SELECT * FROM tracking_performance_stats;

3. Missions actives:
   - SELECT * FROM missions_with_active_tracking;

*/

-- =============================================================================
-- FIN DU SCRIPT
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 Configuration tracking GPS terminée avec succès!';
  RAISE NOTICE '📍 Tables créées: mission_tracking_live, mission_tracking_history, public_tracking_links';
  RAISE NOTICE '🔒 Policies RLS activées';
  RAISE NOTICE '⚡ Realtime activé';
  RAISE NOTICE '🧹 Fonctions de nettoyage prêtes';
  RAISE NOTICE '👉 Prochaine étape: Implémenter service Flutter background';
END;
$$;
