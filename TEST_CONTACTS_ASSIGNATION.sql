-- 🔍 DIAGNOSTIC: POURQUOI LES ASSIGNÉS NE VOIENT PAS LES MISSIONS

-- ========================================
-- 1. VÉRIFIER STRUCTURE TABLE CONTACTS
-- ========================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'contacts'
ORDER BY ordinal_position;

-- ========================================
-- 2. VÉRIFIER SI CONTACTS ONT UN USER_ID
-- ========================================

SELECT 
  c.id,
  c.name,
  c.email,
  c.role,
  c.user_id,
  CASE 
    WHEN c.user_id IS NOT NULL THEN '✅ A un compte utilisateur'
    ELSE '❌ PAS de compte utilisateur'
  END as statut_compte
FROM contacts c
LIMIT 10;

-- ========================================
-- 3. VÉRIFIER ASSIGNATIONS EXISTANTES
-- ========================================

SELECT 
  ma.id,
  c.name as contact_nom,
  c.email as contact_email,
  c.user_id as contact_user_id,
  m.reference as mission_ref,
  m.client_name,
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
-- 4. COMPTER CONTACTS AVEC/SANS COMPTE
-- ========================================

SELECT 
  '📊 Statistiques Contacts' as titre,
  COUNT(*) as total_contacts,
  COUNT(user_id) as contacts_avec_compte,
  COUNT(*) - COUNT(user_id) as contacts_sans_compte,
  CASE 
    WHEN COUNT(user_id) = 0 THEN '❌ PROBLÈME: Aucun contact n''a de compte utilisateur !'
    WHEN COUNT(user_id) < COUNT(*) THEN '⚠️ ATTENTION: Certains contacts n''ont pas de compte'
    ELSE '✅ Tous les contacts ont un compte'
  END as diagnostic
FROM contacts;

-- ========================================
-- 5. VÉRIFIER QUELLE PAGE CHARGE LES MISSIONS ASSIGNÉES
-- ========================================

-- Théorie: Les missions assignées devraient apparaître dans:
-- - TrackingList (si l'utilisateur connecté a un contact associé)
-- - OU une page dédiée pour les chauffeurs

-- Vérifier si les profiles ont des contacts associés
SELECT 
  p.id as profile_id,
  p.email as profile_email,
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
-- 6. SOLUTION PROPOSÉE
-- ========================================

SELECT '
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🔍 DIAGNOSTIC: Assignés ne voient pas les missions     ║
║                                                            ║
║   📋 Problème probable:                                    ║
║                                                            ║
║   Les CONTACTS dans la table "contacts" ne sont PAS       ║
║   des utilisateurs qui peuvent se connecter.               ║
║                                                            ║
║   Ils sont juste des "fiches" créées par l''utilisateur   ║
║   pour gérer son équipe (nom, téléphone, email, rôle).    ║
║                                                            ║
║   💡 Solutions possibles:                                  ║
║                                                            ║
║   OPTION 1: Lier contacts aux utilisateurs                ║
║   - Ajouter colonne user_id dans contacts                 ║
║   - Inviter les contacts à créer un compte                ║
║   - Ils se connectent et voient leurs missions            ║
║                                                            ║
║   OPTION 2: Page publique de suivi                        ║
║   - Générer un lien unique par contact                    ║
║   - Contact clique le lien (pas de login requis)          ║
║   - Voit ses missions assignées                           ║
║                                                            ║
║   OPTION 3: Notifications par email/SMS                   ║
║   - Quand mission assignée → email au contact             ║
║   - Email contient détails de la mission                  ║
║   - Contact n''a pas besoin de se connecter               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
' as MESSAGE;

-- ========================================
-- 7. VÉRIFIER SI user_id EXISTE DANS CONTACTS
-- ========================================

SELECT 
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'contacts' 
    AND column_name = 'user_id'
  ) as colonne_user_id_existe;
