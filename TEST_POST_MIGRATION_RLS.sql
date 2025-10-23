-- ============================================
-- TEST POST-MIGRATION : Vérifier RLS et Policies
-- Date : 22 octobre 2025
-- ============================================

-- ✅ ÉTAPE 1 : Vérifier RLS activé
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ ACTIVÉ'
    ELSE '❌ DÉSACTIVÉ'
  END as status
FROM pg_tables
WHERE tablename IN ('missions', 'mission_assignments')
  AND schemaname = 'public';

-- Résultat attendu :
-- missions            | true | ✅ ACTIVÉ
-- mission_assignments | true | ✅ ACTIVÉ

-- ✅ ÉTAPE 2 : Vérifier les 4 policies créées
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️ Voir'
    WHEN cmd = 'INSERT' THEN '➕ Créer'
    WHEN cmd = 'UPDATE' THEN '✏️ Modifier'
    WHEN cmd = 'DELETE' THEN '🗑️ Supprimer'
  END as description
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY cmd;

-- Résultat attendu : 4 lignes
-- missions_select_policy | SELECT | 👁️ Voir
-- missions_insert_policy | INSERT | ➕ Créer
-- missions_update_policy | UPDATE | ✏️ Modifier
-- missions_delete_policy | DELETE | 🗑️ Supprimer

-- ✅ ÉTAPE 3 : Vérifier colonne assigned_to_user_id
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'missions' 
  AND column_name IN ('user_id', 'assigned_to_user_id')
ORDER BY column_name;

-- Résultat attendu : 2 colonnes
-- assigned_to_user_id | uuid | YES | NULL
-- user_id            | uuid | YES | NULL

-- ✅ ÉTAPE 4 : Statistiques missions
SELECT 
  COUNT(*) as total_missions,
  COUNT(assigned_to_user_id) as missions_avec_assignee,
  COUNT(DISTINCT user_id) as createurs_uniques,
  COUNT(DISTINCT assigned_to_user_id) as assignees_uniques
FROM missions;

-- ✅ ÉTAPE 5 : Test de visibilité (à exécuter en tant qu'user connecté)
-- Remplacer 'YOUR_USER_ID' par votre ID utilisateur
-- Pour obtenir votre ID : SELECT auth.uid();

-- Missions créées par moi
SELECT 
  'Mes missions créées' as type,
  COUNT(*) as count,
  STRING_AGG(reference, ', ') as references
FROM missions
WHERE user_id = auth.uid();

-- Missions assignées à moi
SELECT 
  'Mes missions assignées' as type,
  COUNT(*) as count,
  STRING_AGG(reference, ', ') as references
FROM missions
WHERE assigned_to_user_id = auth.uid();

-- Total visible
SELECT 
  'Total missions visibles' as type,
  COUNT(*) as count
FROM missions
WHERE user_id = auth.uid() OR assigned_to_user_id = auth.uid();

-- ============================================
-- ✅ TOUT EST OK SI :
-- ============================================
-- 1. RLS activé sur missions = true
-- 2. 4 policies existent (select, insert, update, delete)
-- 3. Colonne assigned_to_user_id existe (type uuid)
-- 4. Les requêtes de test retournent des données sans erreur
