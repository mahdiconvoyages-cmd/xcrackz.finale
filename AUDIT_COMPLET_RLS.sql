-- ============================================================================
-- AUDIT COMPLET : Vérifier que rien n'est cassé après les fixes RLS
-- ============================================================================
-- Exécuter dans Supabase SQL Editor — NE MODIFIE RIEN, lecture seule
-- ============================================================================

-- ============================================================
-- 1. COLONNES DE LA TABLE MISSIONS
--    Vérifie s'il y a assigned_user_id ET/OU assigned_to_user_id
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'missions'
  AND column_name IN ('user_id', 'assigned_user_id', 'assigned_to_user_id', 'driver_id')
ORDER BY column_name;

-- ============================================================
-- 2. TOUTES LES POLICIES SUR LES 15 TABLES CRITIQUES
--    Affiche nom, opération, et condition (tronquée)
-- ============================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles::text,
  LEFT(qual::text, 120) AS condition_using,
  LEFT(with_check::text, 120) AS condition_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'missions',
    'vehicle_inspections',
    'inspection_photos_v2',
    'inspection_documents',
    'inspection_damages',
    'inspection_expenses',
    'inspection_report_shares',
    'inspection_pdfs',
    'profiles',
    'clients',
    'invoices',
    'invoice_items',
    'quotes',
    'quote_items',
    'subscriptions',
    'credit_transactions',
    'ride_offers',
    'ride_matches',
    'ride_requests',
    'ride_messages',
    'ride_ratings',
    'gps_tracking_sessions',
    'public_tracking_links',
    'mission_tracking_live',
    'mission_tracking_history',
    'contacts',
    'referrals',
    'support_conversations',
    'support_messages',
    'deletion_requests',
    'signup_attempts'
  )
ORDER BY tablename, cmd, policyname;

-- ============================================================
-- 3. TABLES AVEC RLS ACTIVÉ MAIS 0 POLICIES (DANGER!)
-- ============================================================
SELECT 
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COALESCE(p.policy_count, 0) AS policy_count,
  CASE 
    WHEN t.rowsecurity = true AND COALESCE(p.policy_count, 0) = 0 
    THEN '⛔ BLOQUÉ — RLS activé mais aucune policy!'
    WHEN t.rowsecurity = false 
    THEN '⚠️ RLS désactivé — pas de sécurité'
    ELSE '✅ OK'
  END AS status
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE '_realtime%'
  AND t.tablename NOT LIKE 'supabase_%'
  AND t.tablename NOT IN ('schema_migrations', 'buckets', 'objects', 's3_multipart_uploads', 's3_multipart_uploads_parts', 'hooks', 'mux_state', 'key', 'secrets', 'decrypted_secrets', 'saml_providers', 'saml_relay_states', 'sso_domains', 'sso_providers', 'flow_state', 'mfa_amr_claims', 'mfa_challenges', 'mfa_factors', 'one_time_tokens', 'sessions', 'identities', 'instances', 'refresh_tokens', 'audit_log_entries')
ORDER BY 
  CASE 
    WHEN t.rowsecurity = true AND COALESCE(p.policy_count, 0) = 0 THEN 0
    WHEN t.rowsecurity = false THEN 1
    ELSE 2
  END,
  t.tablename;

-- ============================================================
-- 4. POLICIES QUI RÉFÉRENCENT assigned_to_user_id (POTENTIEL BUG)
--    Si la colonne n'existe pas ou est toujours NULL, ces policies
--    ne marcheront pas comme prévu
-- ============================================================
SELECT 
  tablename,
  policyname,
  cmd,
  qual::text AS full_condition
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual::text ILIKE '%assigned_to_user_id%' 
       OR with_check::text ILIKE '%assigned_to_user_id%')
ORDER BY tablename;

-- ============================================================
-- 5. VÉRIFIER QUE claim_mission SET bien assigned_user_id
-- ============================================================
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'claim_mission';

-- ============================================================
-- 6. SUBSCRIPTIONS — L'utilisateur peut-il INSERT sa subscription ?
--    (signup_wizard crée un abonnement free)
-- ============================================================
SELECT 
  policyname, cmd, roles::text, 
  LEFT(qual::text, 150) AS condition,
  LEFT(with_check::text, 150) AS check_condition
FROM pg_policies
WHERE tablename = 'subscriptions'
ORDER BY cmd;

-- ============================================================
-- 7. PROFILES — Vérifier UPSERT fonctionne (signup + edit)
-- ============================================================
SELECT 
  policyname, cmd, roles::text,
  LEFT(qual::text, 150) AS condition,
  LEFT(with_check::text, 150) AS check_condition
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd;
