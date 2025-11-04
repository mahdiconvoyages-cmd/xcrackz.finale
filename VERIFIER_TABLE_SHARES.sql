-- ========================================
-- 🔍 VÉRIFIER SI LA TABLE EXISTE
-- ========================================
-- Copiez cette requête dans Supabase SQL Editor
-- ========================================

SELECT 
  table_name,
  table_type
FROM 
  information_schema.tables
WHERE 
  table_schema = 'public'
  AND table_name = 'inspection_report_shares';

-- Si cette requête ne retourne AUCUNE ligne,
-- cela signifie que la table n'existe PAS !
-- 
-- Dans ce cas, vous DEVEZ exécuter 
-- INSTALLATION_PARTAGE_RAPPORTS.sql
