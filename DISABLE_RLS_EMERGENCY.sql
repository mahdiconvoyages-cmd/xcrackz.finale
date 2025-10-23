-- ================================================
-- CORRECTION URGENTE - DÉSACTIVER RLS TEMPORAIREMENT
-- Pour vérifier que les données existent vraiment
-- ================================================

-- DÉSACTIVER TEMPORAIREMENT RLS SUR TOUTES LES TABLES
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos DISABLE ROW LEVEL SECURITY;

-- COMPTER LES DONNÉES RÉELLES
SELECT 'MISSIONS' as table_name, COUNT(*) as total FROM missions
UNION ALL
SELECT 'CONTACTS', COUNT(*) FROM contacts
UNION ALL
SELECT 'FACTURES', COUNT(*) FROM invoices
UNION ALL
SELECT 'DEVIS', COUNT(*) FROM quotes
UNION ALL
SELECT 'CLIENTS', COUNT(*) FROM clients
UNION ALL
SELECT 'CREDITS', COUNT(*) FROM user_credits
UNION ALL
SELECT 'INSPECTIONS', COUNT(*) FROM vehicle_inspections
UNION ALL
SELECT 'PHOTOS', COUNT(*) FROM inspection_photos;

SELECT '⚠️ RLS DÉSACTIVÉ - Vos données sont là !' as message;
SELECT '🔍 Regardez dans votre interface maintenant' as instruction;
