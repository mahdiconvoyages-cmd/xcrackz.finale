-- ================================================
-- ACTIVER LES 2 TABLES MANQUANTES POUR REALTIME
-- ================================================

-- missions ✅ (déjà activé)
-- vehicle_inspections ✅ (déjà activé)
-- carpooling ❓ (à tester)
-- inspection_photos_v2 ❓ (à tester)

-- ================================================
-- EXÉCUTER LIGNE PAR LIGNE
-- ================================================

-- 1. Essayer d'activer carpooling
ALTER PUBLICATION supabase_realtime ADD TABLE carpooling;

-- 2. Essayer d'activer inspection_photos_v2
ALTER PUBLICATION supabase_realtime ADD TABLE inspection_photos_v2;

-- ================================================
-- VÉRIFICATION FINALE
-- ================================================

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
-- carpooling            | Realtime ✅
-- inspection_photos_v2  | Realtime ✅
-- missions              | Realtime ✅
-- vehicle_inspections   | Realtime ✅
