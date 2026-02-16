-- ============================================
-- FORCE RESTART POSTGREST - MÉTHODE BRUTALE
-- ============================================

-- 1. Tuer TOUTES les connexions PostgREST
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE application_name LIKE '%PostgREST%'
OR application_name LIKE '%pgrst%';

-- 2. Supprimer le cache de schéma (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'pgrst_schema_cache') THEN
        DROP TABLE pgrst_schema_cache CASCADE;
    END IF;
END $$;

-- 3. Forcer PLUSIEURS reloads successifs
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);

-- 4. Vérifier que la colonne existe VRAIMENT
SELECT 
    '🔍 VÉRIFICATION COLONNE:' as info,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'missions' 
        AND column_name = 'assigned_to_user_id'
    ) as colonne_existe;

-- 5. Tester la fonction DIRECTEMENT dans SQL
SELECT '🧪 TEST DIRECT DE LA FONCTION:' as info;

SELECT join_mission_with_code(
    'XZ-UZ6-37L',
    '784dd826-62ae-4d94-81a0-618953d63010'::uuid
) as resultat;
