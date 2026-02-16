-- ================================================
-- SOLUTION ULTIME: DÉSACTIVER RLS VIA DASHBOARD
-- ================================================
-- Puisque vous n'avez pas les droits OWNER via SQL,
-- vous devez utiliser le Dashboard Supabase

/*
📋 INSTRUCTIONS DASHBOARD SUPABASE:

1. Aller sur: https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn

2. Dans la barre latérale, cliquer sur "Database"

3. Cliquer sur "Tables" → Rechercher "storage.objects"

4. Cliquer sur "storage.objects"

5. En haut à droite, chercher l'icône "⚙️ Settings" ou "..." (trois points)

6. Chercher l'option "Row Level Security" ou "RLS"

7. DÉSACTIVER RLS (toggle OFF)

8. Faire la même chose pour "storage.buckets"

ALTERNATIVE SI PAS D'OPTION RLS DANS LES PARAMÈTRES:

1. Aller dans "SQL Editor"

2. Créer une nouvelle requête et exécuter:
   
   -- Vous devez avoir les droits admin pour ceci
   ALTER ROLE authenticator SET row_security = off;
   
3. Ou contactez le support Supabase pour désactiver RLS sur storage.objects

*/

-- Vérification actuelle de RLS
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS ACTIVÉ (PROBLÈME)'
    ELSE '🔓 RLS DÉSACTIVÉ (OK)'
  END as rls_status,
  CASE 
    WHEN rowsecurity THEN 'DÉSACTIVER RLS via Dashboard ou Support Supabase'
    ELSE 'RLS déjà désactivé - Le problème est ailleurs'
  END as action_requise
FROM pg_tables
WHERE schemaname = 'storage'
AND tablename IN ('objects', 'buckets')
ORDER BY tablename;

-- Afficher le propriétaire des tables storage
SELECT 
  schemaname,
  tablename,
  tableowner as proprietaire,
  'Seul le propriétaire peut modifier RLS' as note
FROM pg_tables
WHERE schemaname = 'storage'
AND tablename IN ('objects', 'buckets');

SELECT '⚠️ Impossible de désactiver RLS sans être OWNER - Utilisez le Dashboard Supabase' as resultat;
