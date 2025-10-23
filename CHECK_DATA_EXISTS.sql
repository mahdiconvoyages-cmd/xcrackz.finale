-- ================================================
-- VÉRIFICATION DONNÉES EXISTANTES
-- ================================================

-- Compter les missions
SELECT 
  'missions' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM missions;

-- Compter les inspections
SELECT 
  'vehicle_inspections' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN inspection_type = 'departure' THEN 1 END) as departure,
  COUNT(CASE WHEN inspection_type = 'arrival' THEN 1 END) as arrival
FROM vehicle_inspections;

-- Compter les photos d'inspection
SELECT 
  'inspection_photos' as table_name,
  COUNT(*) as total_rows
FROM inspection_photos;

-- Compter les factures
SELECT 
  'invoices' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM invoices;

-- Compter les utilisateurs
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'user' THEN 1 END) as users
FROM profiles;

-- Vérifier les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
