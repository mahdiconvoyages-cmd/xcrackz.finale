-- 🔍 DIAGNOSTIC SIMPLIFIÉ: Pourquoi "Mes Missions" est vide ?

-- ========================================
-- ÉTAPE 1: Trouvez votre User ID et Contact
-- ========================================

-- Remplacez 'mahdi@example.com' par VOTRE EMAIL réel
SELECT 
  '1️⃣ Votre profil' as etape,
  p.id as user_id,
  p.email as email,
  c.id as contact_id,
  c.name as contact_nom,
  CASE 
    WHEN c.id IS NOT NULL THEN '✅ Vous avez un contact lié'
    ELSE '❌ PROBLÈME: Aucun contact lié à votre compte'
  END as resultat
FROM profiles p
LEFT JOIN contacts c ON c.user_id = p.id
WHERE p.email = 'mahdi@example.com';  -- ⚠️ CHANGEZ ICI

-- ========================================
-- ÉTAPE 2: Vérifier TOUTES les assignations
-- ========================================

SELECT 
  '2️⃣ Toutes les assignations' as etape,
  ma.id,
  m.reference as mission,
  c.name as assigne_a,
  c.email as email_contact,
  c.user_id as contact_user_id,
  ma.status
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
ORDER BY ma.assigned_at DESC;

-- ========================================
-- ÉTAPE 3: Vérifier les contacts
-- ========================================

SELECT 
  '3️⃣ Tous les contacts' as etape,
  c.id,
  c.name,
  c.email,
  c.user_id,
  CASE 
    WHEN c.user_id IS NOT NULL THEN '✅ Peut se connecter'
    ELSE '❌ Ne peut PAS se connecter'
  END as connexion_possible
FROM contacts c
ORDER BY c.created_at DESC;

-- ========================================
-- ÉTAPE 4: SOLUTION - Lier votre compte à un contact
-- ========================================

-- Option A: Si le contact a le MÊME email que vous
/*
UPDATE contacts 
SET user_id = (SELECT id FROM profiles WHERE email = 'mahdi@example.com')
WHERE email = 'mahdi@example.com';
*/

-- Option B: Si le contact a un email DIFFÉRENT, utilisez l'ID du contact
/*
UPDATE contacts 
SET user_id = (SELECT id FROM profiles WHERE email = 'mahdi@example.com')
WHERE id = 'CONTACT_ID_ICI';  -- Prenez l'ID depuis l'étape 3
*/

-- ========================================
-- ÉTAPE 5: Vérifier après modification
-- ========================================

SELECT 
  '5️⃣ Vérification finale' as etape,
  p.email as utilisateur,
  c.name as contact,
  COUNT(ma.id) as missions_assignees
FROM profiles p
JOIN contacts c ON c.user_id = p.id
LEFT JOIN mission_assignments ma ON ma.contact_id = c.id
WHERE p.email = 'mahdi@example.com'  -- ⚠️ CHANGEZ ICI
GROUP BY p.email, c.name;
