-- 🔧 CORRECTION FINALE - mahdi.convoyages@gmail.com
-- User ID: c37f15d6-545a-4792-9697-de03991b4f17

-- ========================================
-- ÉTAPE 1: État actuel (AVANT correction)
-- ========================================

SELECT 
  '1️⃣ Contacts AVANT correction' as test,
  c.id as contact_id,
  c.email,
  c.user_id,
  p.email as user_email,
  CASE 
    WHEN c.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ BON user_id'
    ELSE '❌ Mauvais user_id'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com';

SELECT 
  '1️⃣ Assignations AVANT correction' as test,
  ma.id,
  m.reference,
  c.email as contact_email,
  ma.user_id as assignation_user_id,
  p.email as user_email,
  CASE 
    WHEN ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ BON user_id'
    ELSE '❌ Mauvais user_id'
  END as statut
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- ÉTAPE 2: Supprimer les contacts en doublon
-- ========================================

-- Supprimer le contact lié à mahdi.benamor1994@gmail.com
DELETE FROM contacts 
WHERE id = 'd03c850d-04fd-4611-b9cb-e6533e926366'
  AND email = 'mahdi.convoyages@gmail.com'
  AND user_id = '784dd826-62ae-4d94-81a0-618953d63010';

-- Supprimer le contact lié à convoiexpress95@gmail.com
DELETE FROM contacts 
WHERE id = '2acca8cd-0bbd-4208-817d-72d5706a20e2'
  AND email = 'mahdi.convoyages@gmail.com'
  AND user_id = 'b5adbb76-c33f-45df-a236-649564f63af5';

SELECT 
  '2️⃣ Contacts APRÈS suppression doublons' as test,
  COUNT(*) as nombre_contacts_restants
FROM contacts
WHERE email = 'mahdi.convoyages@gmail.com';

-- Résultat attendu: 0 ou 1 contact

-- ========================================
-- ÉTAPE 3: Créer le BON contact (si n'existe pas)
-- ========================================

-- Vérifier si le contact existe déjà
DO $$
BEGIN
  -- Si aucun contact n'existe avec le bon user_id, on le crée
  IF NOT EXISTS (
    SELECT 1 FROM contacts 
    WHERE email = 'mahdi.convoyages@gmail.com' 
      AND user_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
  ) THEN
    INSERT INTO contacts (name, email, user_id, role, phone)
    VALUES (
      'mahdi.convoyages@gmail.com',
      'mahdi.convoyages@gmail.com',
      'c37f15d6-545a-4792-9697-de03991b4f17',
      'driver',
      NULL
    );
  END IF;
END $$;

SELECT 
  '3️⃣ Contact créé/mis à jour' as test,
  c.id,
  c.email,
  c.user_id,
  p.email as user_email,
  CASE 
    WHEN c.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ CORRECT'
    ELSE '❌ ERREUR'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com';

-- ========================================
-- ÉTAPE 4: Corriger TOUTES les assignations
-- ========================================

-- Récupérer l'ID du bon contact
WITH bon_contact AS (
  SELECT id FROM contacts 
  WHERE email = 'mahdi.convoyages@gmail.com' 
    AND user_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
  LIMIT 1
)
-- Mettre à jour les assignations avec mauvais contact_id ou mauvais user_id
UPDATE mission_assignments ma
SET 
  contact_id = (SELECT id FROM bon_contact),
  user_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
FROM contacts c
WHERE ma.contact_id = c.id
  AND c.email = 'mahdi.convoyages@gmail.com'
  AND (ma.user_id != 'c37f15d6-545a-4792-9697-de03991b4f17' 
       OR ma.contact_id != (SELECT id FROM bon_contact));

SELECT 
  '4️⃣ Nombre assignations corrigées' as test,
  COUNT(*) as nombre
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
  AND ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17';

-- ========================================
-- ÉTAPE 5: Vérification finale complète
-- ========================================

SELECT 
  '5️⃣ Vérification finale - Contacts' as test,
  c.id as contact_id,
  c.email,
  c.user_id,
  p.email as user_email,
  CASE 
    WHEN c.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ CORRECT'
    ELSE '❌ ERREUR'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com';

-- Résultat attendu: 1 seul contact avec statut '✅ CORRECT'

SELECT 
  '5️⃣ Vérification finale - Assignations' as test,
  ma.id as assignation_id,
  m.reference as mission_ref,
  m.vehicle_brand,
  m.vehicle_model,
  m.pickup_address,
  m.delivery_address,
  c.email as contact_email,
  ma.user_id as assignation_user_id,
  p.email as user_email,
  ma.status,
  ma.assigned_at,
  CASE 
    WHEN ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ CORRECT'
    ELSE '❌ ERREUR'
  END as statut
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY ma.assigned_at DESC;

-- Résultat attendu: TOUTES les assignations avec statut '✅ CORRECT'

-- ========================================
-- ÉTAPE 6: Résumé final
-- ========================================

SELECT 
  '6️⃣ RÉSUMÉ FINAL' as test,
  (SELECT COUNT(*) FROM contacts WHERE email = 'mahdi.convoyages@gmail.com') as nombre_contacts,
  (SELECT COUNT(*) FROM mission_assignments ma 
   JOIN contacts c ON c.id = ma.contact_id 
   WHERE c.email = 'mahdi.convoyages@gmail.com') as total_assignations,
  (SELECT COUNT(*) FROM mission_assignments ma 
   JOIN contacts c ON c.id = ma.contact_id 
   WHERE c.email = 'mahdi.convoyages@gmail.com' 
     AND ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17') as assignations_correctes,
  (SELECT COUNT(*) FROM mission_assignments ma 
   JOIN contacts c ON c.id = ma.contact_id 
   WHERE c.email = 'mahdi.convoyages@gmail.com' 
     AND ma.user_id != 'c37f15d6-545a-4792-9697-de03991b4f17') as assignations_incorrectes;

-- Résultat attendu:
-- nombre_contacts: 1
-- assignations_correctes: X (toutes)
-- assignations_incorrectes: 0
