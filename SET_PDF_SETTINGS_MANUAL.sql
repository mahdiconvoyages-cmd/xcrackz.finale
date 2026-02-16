-- ============================================
-- CONFIGURATION MANUELLE DES SETTINGS PDF
-- ============================================
-- À exécuter dans le SQL Editor de Supabase Studio
-- Remplace <ta-service-role-key> par ta vraie clé avant exécution

-- 1. Configurer l'URL de la fonction Edge
ALTER DATABASE postgres SET app.supabase_function_url = 'https://bfrkthzovwpjrvqktdjn.supabase.co/functions/v1';

-- 2. Configurer la clé Service Role (remplace la valeur ci-dessous)
ALTER DATABASE postgres SET app.supabase_service_role_key = '<ta-service-role-key>';

-- 3. Vérification immédiate
SELECT 
  '✅ app.supabase_function_url' AS setting,
  current_setting('app.supabase_function_url', true) AS value;

SELECT 
  '✅ app.supabase_service_role_key' AS setting,
  CASE 
    WHEN current_setting('app.supabase_service_role_key', true) <> '' 
    THEN '***CONFIGURED***' 
    ELSE 'NULL' 
  END AS value;

-- Note: Ces paramètres s'appliquent aux nouvelles connexions.
-- Si tu exécutes immédiatement après, tu peux devoir te déconnecter/reconnecter
-- ou rafraîchir pour que les requêtes suivantes voient les nouvelles valeurs.
