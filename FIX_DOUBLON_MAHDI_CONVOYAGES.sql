-- 🔧 CORRECTION DU DOUBLON mahdi.convoyages@gmail.com

-- ========================================
-- ÉTAPE 1: Identifier le VRAI compte mahdi.convoyages
-- ========================================

-- Vérifier quel profil correspond à mahdi.convoyages@gmail.com
SELECT 
  '1️⃣ Quel est le vrai profil mahdi.convoyages ?' as question,
  id as user_id,
  email,
  created_at
FROM profiles
WHERE email = 'mahdi.convoyages@gmail.com';

-- Si le résultat est VIDE, mahdi.convoyages n'a PAS de compte
-- Si le résultat existe, notez le user_id

-- ========================================
-- ÉTAPE 2: Vérifier les assignations actuelles
-- ========================================

SELECT 
  '2️⃣ Assignations actuelles pour mahdi.convoyages (par contact)' as test,
  ma.id as assignation_id,
  m.reference as mission_ref,
  c.id as contact_id,
  c.name as contact_name,
  c.user_id as contact_user_id,
  p.email as user_email,
  ma.user_id as assignation_user_id,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- ÉTAPE 3a: SI mahdi.convoyages@gmail.com a un profil (user_id existe)
-- ========================================

-- Mettre à jour toutes les assignations pour utiliser le BON user_id
-- ⚠️ DÉCOMMENTEZ cette requête SEULEMENT si l'ÉTAPE 1 a trouvé un profil

/*
UPDATE mission_assignments ma
SET user_id = (SELECT id FROM profiles WHERE email = 'mahdi.convoyages@gmail.com')
FROM contacts c
WHERE ma.contact_id = c.id
  AND c.email = 'mahdi.convoyages@gmail.com'
  AND ma.user_id != (SELECT id FROM profiles WHERE email = 'mahdi.convoyages@gmail.com');

-- Vérifier la correction
SELECT 
  '3️⃣a Vérification après correction' as test,
  ma.id,
  m.reference,
  ma.user_id as assignation_user_id,
  p.email as user_email,
  CASE 
    WHEN ma.user_id = (SELECT id FROM profiles WHERE email = 'mahdi.convoyages@gmail.com') 
    THEN '✅ CORRIGÉ'
    ELSE '❌ Encore incorrect'
  END as statut
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com';
*/

-- ========================================
-- ÉTAPE 3b: SI mahdi.convoyages@gmail.com N'A PAS de profil
-- ========================================

-- Dans ce cas, il faut créer le lien contact → profil existant
-- ⚠️ DÉCOMMENTEZ cette requête SEULEMENT si l'ÉTAPE 1 n'a trouvé AUCUN profil

-- Option 3b-1: Si mahdi.convoyages doit être lié à convoiexpress95@gmail.com
/*
-- Supprimer le doublon
DELETE FROM contacts 
WHERE id = 'd03c850d-04fd-4611-b9cb-e6533e926366'  -- Celui lié à mahdi.benamor1994
  AND email = 'mahdi.convoyages@gmail.com';

-- Garder uniquement le contact lié à convoiexpress95
-- Pas besoin de UPDATE, il est déjà correct (id: 2acca8cd...)

-- Corriger les assignations pour utiliser le user_id de convoiexpress95
UPDATE mission_assignments ma
SET user_id = 'b5adbb76-c33f-45df-a236-649564f63af5'  -- convoiexpress95@gmail.com
FROM contacts c
WHERE ma.contact_id = c.id
  AND c.email = 'mahdi.convoyages@gmail.com'
  AND ma.user_id != 'b5adbb76-c33f-45df-a236-649564f63af5';
*/

-- Option 3b-2: Si mahdi.convoyages doit être lié à mahdi.benamor1994@gmail.com
/*
-- Supprimer le doublon
DELETE FROM contacts 
WHERE id = '2acca8cd-0bbd-4208-817d-72d5706a20e2'  -- Celui lié à convoiexpress95
  AND email = 'mahdi.convoyages@gmail.com';

-- Garder uniquement le contact lié à mahdi.benamor1994
-- Les assignations sont déjà correctes (user_id: 784dd826...)
*/

-- ========================================
-- ÉTAPE 4: Vérification finale
-- ========================================

SELECT 
  '4️⃣ Vérification finale - Contacts restants' as test,
  c.id as contact_id,
  c.email as contact_email,
  c.user_id,
  p.email as user_email
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com';

SELECT 
  '4️⃣ Vérification finale - Assignations' as test,
  ma.id,
  m.reference,
  c.email as contact_email,
  ma.user_id as assignation_user_id,
  p.email as user_email,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY ma.assigned_at DESC;
