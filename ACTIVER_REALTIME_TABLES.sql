-- ================================================
-- ACTIVER REALTIME SUR LES TABLES PRINCIPALES
-- À exécuter dans l'éditeur SQL Supabase
-- ================================================

-- 📌 Ce script active Realtime pour la synchronisation automatique
-- entre web et mobile sans rafraîchissement manuel

-- ================================================
-- ÉTAPE 1: VÉRIFIER LES TABLES DÉJÀ ACTIVÉES
-- ================================================
-- Exécuter CETTE requête en PREMIER pour voir ce qui est déjà activé:

SELECT 
  schemaname, 
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime'
ORDER BY 
  tablename;

-- ================================================
-- ÉTAPE 2: ACTIVER UNIQUEMENT LES TABLES MANQUANTES
-- ================================================

-- ⚠️ Si la table est déjà dans la liste ci-dessus, NE PAS l'ajouter !
-- ⚠️ Commenter (avec --) les lignes des tables déjà activées

-- 1. MISSIONS (si pas déjà activé)
-- ALTER PUBLICATION supabase_realtime ADD TABLE missions;

-- 2. VEHICLE_INSPECTIONS (si pas déjà activé)
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_inspections;

-- 3. CARPOOLING (si pas déjà activé)
ALTER PUBLICATION supabase_realtime ADD TABLE carpooling;

-- 4. INSPECTION_PHOTOS_V2 (si pas déjà activé - optionnel)
ALTER PUBLICATION supabase_realtime ADD TABLE inspection_photos_v2;

-- ================================================
-- CE QUI SERA SYNCHRONISÉ EN TEMPS RÉEL
-- ================================================

-- ✅ MISSIONS:
-- - Nouvelles missions créées (web → mobile)
-- - Missions assignées (web → mobile)
-- - Changements de statut (mobile → web)
-- - Modifications des informations

-- ✅ VEHICLE_INSPECTIONS:
-- - Inspections de départ créées (mobile → web)
-- - Inspections d'arrivée créées (mobile → web)
-- - Mises à jour des inspections
-- - Photos ajoutées

-- ✅ CARPOOLING:
-- - Nouvelles propositions (web/mobile → web/mobile)
-- - Demandes de participation
-- - Changements de statut

-- ✅ INSPECTION_PHOTOS_V2:
-- - Photos d'inspection uploadées en temps réel
-- - Progression visible instantanément

-- ================================================
-- VÉRIFICATION FINALE
-- ================================================
-- Après exécution, vérifier à nouveau:

SELECT 
  tablename,
  'Realtime ✅' as status
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime'
  AND tablename IN ('missions', 'vehicle_inspections', 'carpooling', 'inspection_photos_v2')
ORDER BY 
  tablename;

-- Résultat attendu (4 lignes):
-- missions              | Realtime ✅
-- vehicle_inspections   | Realtime ✅
-- carpooling            | Realtime ✅
-- inspection_photos_v2  | Realtime ✅

-- ================================================
-- NOTES IMPORTANTES
-- ================================================

-- ✅ Après exécution de ce script:
-- - Les hooks useRealtimeSync fonctionneront automatiquement
-- - Plus besoin de rafraîchir manuellement sur mobile
-- - Synchronisation instantanée web ↔ mobile

-- ⚠️ Coût Supabase:
-- - Realtime est inclus dans le plan gratuit
-- - Limite: 200 connexions simultanées (largement suffisant)
-- - Pas de surcoût pour un usage normal

-- 🔒 Sécurité:
-- - Row Level Security (RLS) s'applique aussi au Realtime
-- - Les utilisateurs voient uniquement leurs données
-- - Pas de risque de fuite de données

-- 📊 Performance:
-- - Impact minimal sur la base de données
-- - Websocket efficient (pas de polling)
-- - Mises à jour uniquement quand changement

-- ================================================
-- DÉSACTIVER REALTIME (si besoin)
-- ================================================

-- Pour désactiver Realtime sur une table:
-- ALTER PUBLICATION supabase_realtime DROP TABLE missions;
-- ALTER PUBLICATION supabase_realtime DROP TABLE vehicle_inspections;
-- ALTER PUBLICATION supabase_realtime DROP TABLE carpooling;
-- ALTER PUBLICATION supabase_realtime DROP TABLE inspection_photos_v2;
