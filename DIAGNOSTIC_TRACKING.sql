-- ============================================================
-- DIAGNOSTIC : Vérifier le système de tracking GPS
-- Exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Vérifier que la table public_tracking_links existe
SELECT 'public_tracking_links' AS table_name, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'public_tracking_links'
       ) THEN '✅ EXISTE' ELSE '❌ MANQUANTE - Exécuter SETUP_TRACKING_GPS_BACKEND.sql' END AS status;

-- 2. Vérifier que la table mission_tracking_live existe
SELECT 'mission_tracking_live' AS table_name, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'mission_tracking_live'
       ) THEN '✅ EXISTE' ELSE '❌ MANQUANTE - Exécuter SETUP_TRACKING_GPS_BACKEND.sql' END AS status;

-- 3. Vérifier que la colonne public_tracking_link existe dans missions
SELECT 'missions.public_tracking_link' AS column_name, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'missions' AND column_name = 'public_tracking_link'
       ) THEN '✅ EXISTE' ELSE '❌ MANQUANTE - ALTER TABLE missions ADD COLUMN public_tracking_link TEXT' END AS status;

-- 4. Vérifier que la fonction generate_public_tracking_link existe
SELECT 'generate_public_tracking_link' AS function_name, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.routines 
         WHERE routine_schema = 'public' AND routine_name = 'generate_public_tracking_link'
       ) THEN '✅ EXISTE' ELSE '❌ MANQUANTE - Exécuter SETUP_TRACKING_GPS_BACKEND.sql' END AS status;

-- 5. Vérifier les GRANTS sur la fonction
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'generate_public_tracking_link'
AND routine_schema = 'public';

-- 6. Vérifier les policies RLS sur public_tracking_links
SELECT policyname, cmd, permissive, roles, qual 
FROM pg_policies 
WHERE tablename = 'public_tracking_links';

-- 7. Vérifier les policies RLS sur mission_tracking_live
SELECT policyname, cmd, permissive, roles, qual 
FROM pg_policies 
WHERE tablename = 'mission_tracking_live';

-- 8. Tester la génération d'un lien (remplacer l'UUID par un vrai mission_id)
-- Décommenter et adapter :
-- SELECT generate_public_tracking_link('VOTRE-MISSION-ID-ICI'::uuid);

-- 9. Vérifier les liens existants
SELECT id, mission_id, token, is_active, expires_at, access_count 
FROM public_tracking_links 
ORDER BY created_at DESC 
LIMIT 10;

-- 10. Vérifier les positions GPS récentes
SELECT mission_id, latitude, longitude, last_update, is_active 
FROM mission_tracking_live 
ORDER BY last_update DESC 
LIMIT 10;
