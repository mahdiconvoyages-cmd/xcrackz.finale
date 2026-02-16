-- 🔄 ACTIVER SUPABASE REALTIME SUR TOUTES LES TABLES
-- 
-- Exécuter ce script dans Supabase SQL Editor pour activer
-- la synchronisation temps réel Web ↔ Mobile

-- ✅ ÉTAPE 1 : Activer Realtime sur missions
ALTER PUBLICATION supabase_realtime ADD TABLE missions;

-- ✅ ÉTAPE 2 : Activer Realtime sur mission_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE mission_assignments;

-- ✅ ÉTAPE 3 : Activer Realtime sur mission_locations
ALTER PUBLICATION supabase_realtime ADD TABLE mission_locations;

-- ✅ ÉTAPE 4 : Activer Realtime sur profiles
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 📊 VÉRIFICATION : Lister toutes les tables avec Realtime actif
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ✅ Résultat attendu :
--  schemaname |       tablename        
-- ------------+------------------------
--  public     | mission_assignments
--  public     | mission_locations
--  public     | missions
--  public     | profiles

-- 💡 NOTES :
-- - Realtime fonctionne instantanément après ces commandes
-- - Pas besoin de redémarrer quoi que ce soit
-- - Les subscriptions web/mobile se connectent automatiquement
-- - Supabase gère la scalabilité et les reconnexions

-- 🔔 ÉTAPE 5 (OPTIONNEL) : Créer triggers pour notifications push
-- Voir SYNC_TEMPS_REEL_WEB_MOBILE.md pour setup OneSignal
