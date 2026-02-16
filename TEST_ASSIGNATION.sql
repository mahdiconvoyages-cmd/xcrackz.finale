-- 🔍 TEST SYSTÈME D'ASSIGNATION DE MISSIONS
-- Date: 2025-10-17

-- ========================================
-- 1. VÉRIFIER TABLE mission_assignments EXISTE
-- ========================================

SELECT 
  'Table mission_assignments' as test,
  COUNT(*) as nombre_colonnes,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ Table existe'
    ELSE '❌ Table manquante'
  END as statut
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mission_assignments';

-- ========================================
-- 2. VÉRIFIER COLONNES REQUISES
-- ========================================

SELECT 
  column_name as colonne,
  data_type as type,
  is_nullable as nullable,
  column_default as valeur_defaut
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mission_assignments'
ORDER BY ordinal_position;

-- ========================================
-- 3. VÉRIFIER RLS (ROW LEVEL SECURITY)
-- ========================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_actif
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'mission_assignments';

-- ========================================
-- 4. VÉRIFIER POLICIES RLS
-- ========================================

SELECT 
  policyname as nom_policy,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING clause définie'
    ELSE 'Pas de USING'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK définie'
    ELSE 'Pas de WITH CHECK'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'mission_assignments';

-- ========================================
-- 5. VÉRIFIER ASSIGNATIONS EXISTANTES
-- ========================================

SELECT 
  ma.id,
  m.client_name as mission_client,
  c.name as contact_assigne,
  p.email as utilisateur,
  ma.status as statut,
  ma.payment_ht as montant_ht,
  ma.commission,
  ma.assigned_at as date_assignation
FROM mission_assignments ma
LEFT JOIN missions m ON m.id = ma.mission_id
LEFT JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
ORDER BY ma.assigned_at DESC
LIMIT 10;

-- ========================================
-- 6. COMPTER LES ASSIGNATIONS PAR STATUT
-- ========================================

SELECT 
  status as statut,
  COUNT(*) as nombre
FROM mission_assignments
GROUP BY status
ORDER BY nombre DESC;

-- ========================================
-- 7. VÉRIFIER FOREIGN KEYS
-- ========================================

SELECT
  tc.constraint_name as nom_contrainte,
  tc.table_name as table_source,
  kcu.column_name as colonne_source,
  ccu.table_name as table_cible,
  ccu.column_name as colonne_cible
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'mission_assignments';

-- ========================================
-- 8. TEST PERMISSIONS UTILISATEUR ACTUEL
-- ========================================

-- Vérifier si l'utilisateur actuel peut lire mission_assignments
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM mission_assignments 
      WHERE user_id = auth.uid()
      LIMIT 1
    ) THEN '✅ Peut lire ses assignations'
    WHEN NOT EXISTS (SELECT 1 FROM mission_assignments LIMIT 1) THEN '⚠️ Aucune assignation existante'
    ELSE '❌ Ne peut pas lire les assignations'
  END as permission_lecture;

-- ========================================
-- 9. VÉRIFIER TABLES LIÉES
-- ========================================

SELECT 
  '📋 Missions disponibles' as test,
  COUNT(*) as nombre
FROM missions;

SELECT 
  '👥 Contacts disponibles' as test,
  COUNT(*) as nombre
FROM contacts;

-- ========================================
-- 10. DIAGNOSTIC COMPLET
-- ========================================

SELECT '
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🔍 DIAGNOSTIC SYSTÈME D''ASSIGNATION                     ║
║                                                            ║
║   📋 Que vérifier dans les résultats:                      ║
║                                                            ║
║   1️⃣ Table mission_assignments existe avec 10+ colonnes   ║
║   2️⃣ RLS activé (rowsecurity = true)                      ║
║   3️⃣ 4 policies RLS (SELECT, INSERT, UPDATE, DELETE)      ║
║   4️⃣ Foreign keys vers missions, contacts, profiles       ║
║   5️⃣ Permissions de lecture fonctionnent                  ║
║                                                            ║
║   🚨 Problèmes courants:                                   ║
║                                                            ║
║   ❌ Table n''existe pas → Exécuter migration              ║
║   ❌ RLS bloque tout → Vérifier policies                   ║
║   ❌ Foreign key error → Vérifier IDs existent             ║
║   ❌ Aucun contact → Créer contacts d''abord               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
' as MESSAGE;

-- ========================================
-- 11. SIMULATION INSERT (commenté)
-- ========================================

-- Pour tester l'insertion, décommentez et remplissez:
/*
INSERT INTO mission_assignments (
  mission_id,
  contact_id,
  user_id,
  assigned_by,
  payment_ht,
  commission,
  notes,
  status
) VALUES (
  'MISSION_UUID_ICI'::UUID,
  'CONTACT_UUID_ICI'::UUID,
  auth.uid(),
  auth.uid(),
  1000.00,
  100.00,
  'Test assignation',
  'assigned'
);
*/
