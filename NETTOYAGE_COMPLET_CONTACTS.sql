-- 🧹 NETTOYAGE COMPLET - Supprimer le chaos et repartir à zéro

-- ========================================
-- ÉTAPE 0: État actuel (AVANT nettoyage)
-- ========================================

SELECT 
  '0️⃣ Contacts AVANT nettoyage' as test,
  COUNT(*) as total_contacts,
  COUNT(DISTINCT email) as emails_uniques
FROM contacts
WHERE email IN (
  'mahdi.convoyages@gmail.com',
  'mahdi.benamor1994@gmail.com',
  'convoiexpress95@gmail.com'
);

SELECT 
  '0️⃣ Assignations AVANT nettoyage' as test,
  COUNT(*) as total_assignations
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email IN (
  'mahdi.convoyages@gmail.com',
  'mahdi.benamor1994@gmail.com',
  'convoiexpress95@gmail.com'
);

-- ========================================
-- ÉTAPE 1: Supprimer TOUTES les assignations
-- ========================================

DELETE FROM mission_assignments
WHERE contact_id IN (
  SELECT id FROM contacts 
  WHERE email IN (
    'mahdi.convoyages@gmail.com',
    'mahdi.benamor1994@gmail.com',
    'convoiexpress95@gmail.com'
  )
);

SELECT '1️⃣ Assignations supprimées' as resultat;

-- ========================================
-- ÉTAPE 2: Supprimer TOUS les contacts en doublon
-- ========================================

DELETE FROM contacts
WHERE email IN (
  'mahdi.convoyages@gmail.com',
  'mahdi.benamor1994@gmail.com',
  'convoiexpress95@gmail.com'
);

SELECT '2️⃣ Contacts supprimés' as resultat;

-- ========================================
-- ÉTAPE 3: Recréer les contacts PROPRES (1 par profil)
-- ========================================

-- Contact 1: mahdi.convoyages@gmail.com → user_id c37f15d6...
INSERT INTO contacts (name, email, user_id, role, phone, is_active)
VALUES (
  'mahdi.convoyages@gmail.com',
  'mahdi.convoyages@gmail.com',
  'c37f15d6-545a-4792-9697-de03991b4f17',
  'driver',
  NULL,
  true
);

-- Contact 2: mahdi.benamor1994@gmail.com → user_id 784dd826...
INSERT INTO contacts (name, email, user_id, role, phone, is_active)
VALUES (
  'mahdi.benamor1994@gmail.com',
  'mahdi.benamor1994@gmail.com',
  '784dd826-62ae-4d94-81a0-618953d63010',
  'driver',
  NULL,
  true
);

-- Contact 3: convoiexpress95@gmail.com → user_id b5adbb76...
INSERT INTO contacts (name, email, user_id, role, phone, is_active)
VALUES (
  'convoiexpress95@gmail.com',
  'convoiexpress95@gmail.com',
  'b5adbb76-c33f-45df-a236-649564f63af5',
  'driver',
  NULL,
  true
);

SELECT '3️⃣ Contacts recréés' as resultat;

-- ========================================
-- ÉTAPE 4: Vérification finale
-- ========================================

SELECT 
  '4️⃣ Contacts APRÈS nettoyage' as test,
  c.id as contact_id,
  c.email as contact_email,
  c.user_id as contact_user_id,
  p.email as profil_email,
  CASE 
    WHEN c.email = p.email THEN '✅ CORRECT'
    ELSE '❌ ERREUR'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email IN (
  'mahdi.convoyages@gmail.com',
  'mahdi.benamor1994@gmail.com',
  'convoiexpress95@gmail.com'
)
ORDER BY c.email;

-- Résultat attendu: 3 contacts, tous avec statut ✅ CORRECT

SELECT 
  '4️⃣ Nombre de contacts par email' as test,
  email,
  COUNT(*) as nombre
FROM contacts
WHERE email IN (
  'mahdi.convoyages@gmail.com',
  'mahdi.benamor1994@gmail.com',
  'convoiexpress95@gmail.com'
)
GROUP BY email;

-- Résultat attendu: 3 lignes, chaque email avec nombre = 1

SELECT 
  '4️⃣ Total assignations après nettoyage' as test,
  COUNT(*) as total
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email IN (
  'mahdi.convoyages@gmail.com',
  'mahdi.benamor1994@gmail.com',
  'convoiexpress95@gmail.com'
);

-- Résultat attendu: 0 (tout propre, vous réassignerez)
