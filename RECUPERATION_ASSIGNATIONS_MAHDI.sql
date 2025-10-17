-- 🔧 CORRECTION FINALE V2 - mahdi.convoyages@gmail.com
-- User ID: c37f15d6-545a-4792-9697-de03991b4f17
-- ⚠️ Cette version RÉCUPÈRE les assignations perdues

-- ========================================
-- ÉTAPE 0: Vérifier l'état actuel
-- ========================================

SELECT 
  '0️⃣ État actuel' as test,
  (SELECT COUNT(*) FROM contacts WHERE email = 'mahdi.convoyages@gmail.com') as nombre_contacts,
  (SELECT COUNT(*) FROM mission_assignments ma 
   JOIN contacts c ON c.id = ma.contact_id 
   WHERE c.email = 'mahdi.convoyages@gmail.com') as total_assignations;

-- Si total_assignations = 0, les assignations ont été supprimées en cascade
-- Il faut vérifier dans mission_assignments si elles existent encore avec les anciens contact_id

-- ========================================
-- ÉTAPE 1: Récupérer les assignations "orphelines"
-- ========================================

-- Chercher les assignations qui pointaient vers les anciens contacts
SELECT 
  '1️⃣ Assignations orphelines (si elles existent)' as test,
  ma.id,
  m.reference,
  ma.contact_id as ancien_contact_id,
  ma.user_id,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
WHERE ma.contact_id IN (
  'd03c850d-04fd-4611-b9cb-e6533e926366',  -- Ancien contact lié à mahdi.benamor1994
  '2acca8cd-0bbd-4208-817d-72d5706a20e2'   -- Ancien contact lié à convoiexpress95
)
ORDER BY ma.assigned_at DESC;

-- ========================================
-- ÉTAPE 2: Identifier le bon contact
-- ========================================

SELECT 
  '2️⃣ Contact actuel mahdi.convoyages' as test,
  c.id as contact_id,
  c.email,
  c.user_id,
  p.email as user_email
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
  AND c.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17';

-- Notez le contact_id retourné, vous en aurez besoin

-- ========================================
-- ÉTAPE 3: Restaurer les assignations manuellement
-- ========================================

-- ⚠️ Les assignations ont probablement été supprimées en cascade
-- Il faut les recréer manuellement OU les restaurer depuis un backup

-- Si vous avez les références des missions assignées, vous pouvez les recréer :
-- (DÉCOMMENTEZ et MODIFIEZ avec vos vraies données)

/*
-- Remplacez 'BON_CONTACT_ID' par l'ID du contact de l'ÉTAPE 2
-- Remplacez 'MISSION_ID' par les IDs des missions à réassigner

INSERT INTO mission_assignments (mission_id, contact_id, user_id, assigned_by, payment_ht, commission, notes, status)
VALUES 
  ('MISSION_ID_1', 'BON_CONTACT_ID', 'c37f15d6-545a-4792-9697-de03991b4f17', '784dd826-62ae-4d94-81a0-618953d63010', 0, 0, '', 'assigned'),
  ('MISSION_ID_2', 'BON_CONTACT_ID', 'c37f15d6-545a-4792-9697-de03991b4f17', '784dd826-62ae-4d94-81a0-618953d63010', 0, 0, '', 'assigned'),
  ('MISSION_ID_3', 'BON_CONTACT_ID', 'c37f15d6-545a-4792-9697-de03991b4f17', '784dd826-62ae-4d94-81a0-618953d63010', 0, 0, '', 'assigned');
*/

-- ========================================
-- ÉTAPE 4: Vérification finale
-- ========================================

SELECT 
  '4️⃣ Vérification finale' as test,
  (SELECT COUNT(*) FROM contacts WHERE email = 'mahdi.convoyages@gmail.com') as nombre_contacts,
  (SELECT COUNT(*) FROM mission_assignments ma 
   JOIN contacts c ON c.id = ma.contact_id 
   WHERE c.email = 'mahdi.convoyages@gmail.com') as total_assignations,
  (SELECT COUNT(*) FROM mission_assignments ma 
   JOIN contacts c ON c.id = ma.contact_id 
   WHERE c.email = 'mahdi.convoyages@gmail.com' 
     AND ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17') as assignations_correctes;

-- ========================================
-- 📝 ALTERNATIVE: Lister toutes les missions disponibles
-- ========================================

SELECT 
  '📋 Missions disponibles à réassigner' as info,
  m.id as mission_id,
  m.reference,
  m.vehicle_brand,
  m.vehicle_model,
  m.pickup_address,
  m.delivery_address,
  m.created_at,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM mission_assignments ma 
      WHERE ma.mission_id = m.id
    ) THEN 'Déjà assignée'
    ELSE 'Disponible'
  END as statut
FROM missions m
ORDER BY m.created_at DESC
LIMIT 20;
