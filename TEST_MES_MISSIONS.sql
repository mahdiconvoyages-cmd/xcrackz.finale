-- 🔍 TEST: Vérifier Structure Missions et Assignations

-- ========================================
-- 1. COLONNES TABLE MISSIONS
-- ========================================

SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'missions'
ORDER BY ordinal_position;

-- ========================================
-- 2. MISSIONS ASSIGNÉES AVEC BONNES COLONNES
-- ========================================

SELECT 
  ma.id as assignation_id,
  c.name as contact_nom,
  c.email as contact_email,
  c.user_id as contact_user_id,
  m.reference as mission_ref,
  m.vehicle_brand || ' ' || m.vehicle_model as vehicule,
  m.pickup_address as depart,
  m.delivery_address as arrivee,
  m.pickup_date as date_depart,
  m.delivery_date as date_arrivee,
  ma.payment_ht as montant,
  ma.status as statut_assignation,
  CASE 
    WHEN c.user_id IS NOT NULL THEN '✅ Contact peut se connecter'
    ELSE '❌ Contact ne peut PAS se connecter'
  END as acces_possible
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
JOIN missions m ON m.id = ma.mission_id
ORDER BY ma.assigned_at DESC;

-- ========================================
-- 3. TEST: Missions pour un utilisateur spécifique
-- ========================================

-- Pour tester, remplacez 'EMAIL_USER' par un email réel
SELECT 
  '🎯 Missions pour cet utilisateur' as test,
  p.email as utilisateur_email,
  c.name as contact_nom,
  COUNT(ma.id) as nombre_missions_assignees
FROM profiles p
LEFT JOIN contacts c ON c.user_id = p.id
LEFT JOIN mission_assignments ma ON ma.contact_id = c.id
WHERE p.email = 'EMAIL_USER_ICI'  -- ⚠️ REMPLACEZ PAR EMAIL RÉEL
GROUP BY p.email, c.name;

-- ========================================
-- 4. TOUS LES UTILISATEURS AVEC MISSIONS
-- ========================================

SELECT 
  p.id as user_id,
  p.email,
  c.id as contact_id,
  c.name as contact_name,
  COUNT(ma.id) as missions_assignees
FROM profiles p
LEFT JOIN contacts c ON c.user_id = p.id
LEFT JOIN mission_assignments ma ON ma.contact_id = c.id
GROUP BY p.id, p.email, c.id, c.name
HAVING COUNT(ma.id) > 0
ORDER BY missions_assignees DESC;

-- ========================================
-- 5. DIAGNOSTIC COMPLET
-- ========================================

SELECT '
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ✅ SOLUTION: Page "Mes Missions Assignées"              ║
║                                                            ║
║   📋 Architecture:                                         ║
║                                                            ║
║   1. Utilisateur se connecte (auth.uid())                 ║
║   2. Trouve son contact lié (contacts.user_id)            ║
║   3. Charge missions assignées (mission_assignments)      ║
║   4. Affiche détails complets                             ║
║                                                            ║
║   💡 Query à utiliser:                                     ║
║                                                            ║
║   SELECT ma.*, m.*                                         ║
║   FROM mission_assignments ma                             ║
║   JOIN missions m ON m.id = ma.mission_id                 ║
║   JOIN contacts c ON c.id = ma.contact_id                 ║
║   WHERE c.user_id = auth.uid()                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
' as MESSAGE;
