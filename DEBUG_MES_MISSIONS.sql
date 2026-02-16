-- 🔍 DIAGNOSTIC: Pourquoi "Mes Missions" est vide ?

-- ========================================
-- 1. VÉRIFIER SI L'UTILISATEUR A UN CONTACT LIÉ
-- ========================================

-- Remplacez 'VOTRE_EMAIL' par l'email de l'utilisateur connecté
SELECT 
  '1️⃣ Contact lié à cet utilisateur' as etape,
  p.id as user_id,
  p.email as user_email,
  c.id as contact_id,
  c.name as contact_name,
  CASE 
    WHEN c.id IS NOT NULL THEN '✅ Contact trouvé'
    ELSE '❌ AUCUN CONTACT LIÉ - Il faut lier un contact à cet utilisateur'
  END as resultat
FROM profiles p
LEFT JOIN contacts c ON c.user_id = p.id
WHERE p.email = 'VOTRE_EMAIL';  -- ⚠️ REMPLACEZ PAR L'EMAIL RÉEL

-- ========================================
-- 2. VÉRIFIER LES ASSIGNATIONS POUR CE CONTACT
-- ========================================

-- Si l'étape 1 a trouvé un contact, utilisez son ID ici
SELECT 
  '2️⃣ Missions assignées à ce contact' as etape,
  ma.id as assignation_id,
  m.reference as mission_ref,
  m.vehicle_brand || ' ' || m.vehicle_model as vehicule,
  ma.status as statut,
  p.email as assigne_par,
  ma.assigned_at as date_assignation
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
LEFT JOIN profiles p ON p.id = ma.assigned_by
WHERE ma.contact_id = 'CONTACT_ID_ICI'  -- ⚠️ REMPLACEZ PAR CONTACT_ID DE L'ÉTAPE 1
ORDER BY ma.assigned_at DESC;

-- ========================================
-- 3. VÉRIFIER LA FOREIGN KEY assigned_by
-- ========================================

-- Vérifier que la colonne assigned_by existe et est remplie
SELECT 
  '3️⃣ Vérification colonne assigned_by' as etape,
  ma.id,
  ma.mission_id,
  ma.contact_id,
  ma.assigned_by,
  ma.user_id,
  CASE 
    WHEN ma.assigned_by IS NOT NULL THEN '✅ assigned_by rempli'
    ELSE '⚠️ assigned_by est NULL'
  END as etat_assigned_by
FROM mission_assignments ma
LIMIT 10;

-- ========================================
-- 4. TEST COMPLET AVEC UN EMAIL
-- ========================================

-- Remplacez 'VOTRE_EMAIL' par votre email
WITH user_contact AS (
  SELECT 
    p.id as user_id,
    p.email as user_email,
    c.id as contact_id,
    c.name as contact_name
  FROM profiles p
  LEFT JOIN contacts c ON c.user_id = p.id
  WHERE p.email = 'VOTRE_EMAIL'  -- ⚠️ REMPLACEZ
)
SELECT 
  '4️⃣ Résumé complet' as etape,
  uc.user_email,
  uc.contact_name,
  uc.contact_id,
  COUNT(ma.id) as nombre_missions,
  CASE 
    WHEN uc.contact_id IS NULL THEN '❌ Utilisateur n''a pas de contact lié'
    WHEN COUNT(ma.id) = 0 THEN '⚠️ Contact existe mais aucune mission assignée'
    ELSE '✅ Missions trouvées !'
  END as diagnostic
FROM user_contact uc
LEFT JOIN mission_assignments ma ON ma.contact_id = uc.contact_id
GROUP BY uc.user_email, uc.contact_name, uc.contact_id;

-- ========================================
-- 5. SOLUTION SI PAS DE CONTACT LIÉ
-- ========================================

-- Si l'utilisateur n'a pas de contact, créez le lien :
/*
UPDATE contacts 
SET user_id = (SELECT id FROM profiles WHERE email = 'VOTRE_EMAIL')
WHERE email = 'VOTRE_EMAIL' OR id = 'CONTACT_ID';
*/

-- ========================================
-- 6. VÉRIFIER TOUS LES CONTACTS SANS user_id
-- ========================================

SELECT 
  '6️⃣ Contacts sans user_id' as etape,
  c.id,
  c.name,
  c.email,
  c.user_id,
  CASE 
    WHEN c.user_id IS NULL THEN '❌ Pas de user_id - Ne peut pas se connecter'
    ELSE '✅ user_id présent'
  END as etat
FROM contacts c
ORDER BY c.created_at DESC;
