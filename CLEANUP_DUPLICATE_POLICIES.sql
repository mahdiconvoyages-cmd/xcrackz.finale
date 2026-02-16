-- ============================================
-- NETTOYAGE FINAL: Supprimer toutes les anciennes policies en doublon
-- ============================================
-- Les nouvelles policies (vi_*, ipv2_*, id_*, irs_*, missions_*, profiles_*, ct_*)
-- sont déjà en place. On supprime les doublons anciens.

-- 1. vehicle_inspections - supprimer les anciennes
DROP POLICY IF EXISTS "Inspections - INSERT own or assigned" ON vehicle_inspections;
DROP POLICY IF EXISTS "Inspections - SELECT own or assigned" ON vehicle_inspections;
DROP POLICY IF EXISTS "Inspections - UPDATE own or assigned" ON vehicle_inspections;

-- 2. inspection_photos_v2 - supprimer les anciennes
DROP POLICY IF EXISTS "Allow authenticated to delete inspection photos" ON inspection_photos_v2;
DROP POLICY IF EXISTS "Allow authenticated to insert inspection photos" ON inspection_photos_v2;
DROP POLICY IF EXISTS "Allow public to view inspection photos" ON inspection_photos_v2;
DROP POLICY IF EXISTS "Allow authenticated to update inspection photos" ON inspection_photos_v2;

-- 3. inspection_documents - supprimer les anciennes (rôle {public} = trop permissif)
DROP POLICY IF EXISTS "Users delete own documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users view own and assigned inspection documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users update own documents" ON inspection_documents;

-- 4. inspection_report_shares - supprimer les anciennes (rôle {public})
DROP POLICY IF EXISTS "Users can delete own shares" ON inspection_report_shares;
DROP POLICY IF EXISTS "Users can create own shares" ON inspection_report_shares;
DROP POLICY IF EXISTS "Users can view own shares" ON inspection_report_shares;
DROP POLICY IF EXISTS "Users can update own shares" ON inspection_report_shares;

-- 5. missions - supprimer les anciennes (rôle {public})
DROP POLICY IF EXISTS "missions_remove" ON missions;
DROP POLICY IF EXISTS "missions_create" ON missions;
DROP POLICY IF EXISTS "missions_convoyeur_close" ON missions;
DROP POLICY IF EXISTS "Users can read missions assigned to them" ON missions;

-- 6. profiles - garder les existantes utiles, pas de doublon à supprimer
-- "Users can search profiles by phone" et "Users can view other profiles for covoiturage" sont utiles

-- 7. credit_transactions - supprimer l'ancienne
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename IN (
  'vehicle_inspections', 
  'inspection_photos_v2', 
  'inspection_documents', 
  'inspection_report_shares', 
  'missions', 
  'profiles', 
  'credit_transactions'
)
ORDER BY tablename, cmd;
