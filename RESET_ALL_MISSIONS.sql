-- ================================================================
-- RESET: Supprimer toutes les missions et données liées pour tests
-- ================================================================
-- ATTENTION: Supprime TOUTES les missions et données d'inspection
-- ================================================================

-- 1. Supprimer les partages de rapports
DELETE FROM inspection_report_shares;

-- 2. Supprimer les photos d'inspection
DELETE FROM inspection_photos_v2;

-- 3. Supprimer les documents d'inspection
DELETE FROM inspection_documents;

-- 4. Supprimer les frais d'inspection
DELETE FROM inspection_expenses;

-- 5. Supprimer les inspections
DELETE FROM vehicle_inspections;

-- 6. Supprimer toutes les missions
DELETE FROM missions;

-- Vérification
SELECT 'missions' AS table_name, COUNT(*) AS remaining FROM missions
UNION ALL
SELECT 'vehicle_inspections', COUNT(*) FROM vehicle_inspections
UNION ALL
SELECT 'inspection_photos_v2', COUNT(*) FROM inspection_photos_v2
UNION ALL
SELECT 'inspection_documents', COUNT(*) FROM inspection_documents
UNION ALL
SELECT 'inspection_report_shares', COUNT(*) FROM inspection_report_shares;
