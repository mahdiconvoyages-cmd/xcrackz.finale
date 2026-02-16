-- ================================================
-- VÉRIFICATION COMPLÈTE DE TOUTES LES DONNÉES
-- ================================================

-- 1. VÉRIFIER L'UTILISATEUR CONNECTÉ
SELECT 
  'UTILISATEUR ACTUEL' as info,
  auth.uid() as user_id;

-- 2. MISSIONS
SELECT 
  'MISSIONS' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE user_id = auth.uid()) as mes_missions,
  COUNT(*) FILTER (WHERE assigned_to_user_id = auth.uid()) as missions_assignees
FROM missions;

-- 3. CONTACTS
SELECT 
  'CONTACTS' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE user_id = auth.uid()) as mes_contacts
FROM contacts;

-- 4. FACTURES (invoices)
SELECT 
  'FACTURES' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE user_id = auth.uid()) as mes_factures
FROM invoices;

-- 5. DEVIS (quotes)
SELECT 
  'DEVIS' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE user_id = auth.uid()) as mes_devis
FROM quotes;

-- 6. CLIENTS
SELECT 
  'CLIENTS' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE user_id = auth.uid()) as mes_clients
FROM clients;

-- 7. CRÉDITS
SELECT 
  'CREDITS' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE user_id = auth.uid()) as mes_credits
FROM user_credits;

-- 8. LISTE DES POLITIQUES RLS ACTIVES
SELECT 
  'POLITIQUES RLS' as info,
  tablename,
  policyname,
  cmd,
  CASE WHEN POSITION('auth.uid()' IN qual::text) > 0 THEN 'OUI' ELSE 'NON' END as filtre_user_id
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('missions', 'contacts', 'invoices', 'quotes', 'clients', 'user_credits')
ORDER BY tablename, cmd;

-- 9. VÉRIFIER SI RLS EST ACTIVÉ
SELECT 
  'RLS STATUS' as info,
  tablename,
  CASE WHEN rowsecurity THEN 'ACTIVÉ' ELSE 'DÉSACTIVÉ' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('missions', 'contacts', 'invoices', 'quotes', 'clients', 'user_credits');
