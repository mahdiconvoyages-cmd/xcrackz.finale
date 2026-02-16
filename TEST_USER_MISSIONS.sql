-- 🔍 VÉRIFIER LIAISON UTILISATEURS → CONTACTS → MISSIONS

-- ========================================
-- 1. VÉRIFIER COMBIEN D'UTILISATEURS SONT AUSSI DES CONTACTS
-- ========================================

SELECT 
  '👥 Utilisateurs qui sont aussi des contacts' as titre,
  COUNT(DISTINCT p.id) as total_utilisateurs,
  COUNT(DISTINCT c.id) as utilisateurs_avec_contact,
  COUNT(DISTINCT ma.id) as missions_assignees
FROM profiles p
LEFT JOIN contacts c ON c.user_id = p.id
LEFT JOIN mission_assignments ma ON ma.contact_id = c.id;

-- ========================================
-- 2. LISTE DES UTILISATEURS AVEC MISSIONS ASSIGNÉES
-- ========================================

SELECT 
  p.email as utilisateur_email,
  c.id as contact_id,
  c.name as nom_contact,
  c.role as role,
  COUNT(ma.id) as nb_missions_assignees
FROM profiles p
JOIN contacts c ON c.user_id = p.id
LEFT JOIN mission_assignments ma ON ma.contact_id = c.id
GROUP BY p.email, c.id, c.name, c.role
HAVING COUNT(ma.id) > 0
ORDER BY nb_missions_assignees DESC;

-- ========================================
-- 3. DÉTAIL DES MISSIONS ASSIGNÉES PAR UTILISATEUR
-- ========================================

SELECT 
  p.email as utilisateur,
  c.name as contact_nom,
  m.reference as mission_ref,
  m.client_name as client,
  m.departure_address as depart,
  m.arrival_address as arrivee,
  ma.status as statut_assignation,
  ma.payment_ht as paiement_ht,
  ma.assigned_at as date_assignation
FROM profiles p
JOIN contacts c ON c.user_id = p.id
JOIN mission_assignments ma ON ma.contact_id = c.id
JOIN missions m ON m.id = ma.mission_id
ORDER BY ma.assigned_at DESC;

-- ========================================
-- 4. REQUÊTE POUR LA PAGE "MES MISSIONS"
-- ========================================

-- Cette requête devra être utilisée dans le frontend
-- pour afficher les missions d'un utilisateur connecté

SELECT 
  'Requête pour user_id = auth.uid()' as info,
  'SELECT ma.*, m.* 
   FROM mission_assignments ma
   JOIN missions m ON m.id = ma.mission_id
   JOIN contacts c ON c.id = ma.contact_id
   WHERE c.user_id = auth.uid()
   ORDER BY ma.assigned_at DESC' as requete_sql;

-- ========================================
-- 5. TEST: SIMULER CHARGEMENT POUR UN UTILISATEUR
-- ========================================

-- Remplacez 'EMAIL_UTILISATEUR' par un email réel
SELECT 
  ma.id as assignation_id,
  m.reference,
  m.client_name,
  m.departure_address,
  m.arrival_address,
  m.status as mission_status,
  ma.status as assignation_status,
  ma.payment_ht,
  ma.commission,
  ma.notes,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
JOIN profiles p ON p.id = c.user_id
WHERE p.email = 'REMPLACER_PAR_EMAIL_UTILISATEUR' -- ⚠️ CHANGEZ ICI
ORDER BY ma.assigned_at DESC;

-- ========================================
-- 6. DIAGNOSTIC COMPLET
-- ========================================

SELECT '
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ✅ SOLUTION TROUVÉE !                                   ║
║                                                            ║
║   📋 Architecture actuelle:                                ║
║                                                            ║
║   profiles (utilisateurs avec comptes)                     ║
║       ↓ (user_id)                                          ║
║   contacts (fiches contacts liées aux users)               ║
║       ↓ (contact_id)                                       ║
║   mission_assignments (missions assignées)                 ║
║                                                            ║
║   💡 Solution:                                             ║
║                                                            ║
║   Créer une page "Mes Missions Assignées"                 ║
║   - Accessible aux utilisateurs connectés                  ║
║   - Affiche missions via contact lié à leur user_id       ║
║   - Permet de voir statut, détails, paiement              ║
║                                                            ║
║   🔧 Implémentation:                                       ║
║   1. Nouvelle route: /my-missions                          ║
║   2. Component: MyAssignedMissions.tsx                     ║
║   3. Query: JOIN contacts → mission_assignments            ║
║   4. Filtre: WHERE c.user_id = auth.uid()                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
' as MESSAGE;
