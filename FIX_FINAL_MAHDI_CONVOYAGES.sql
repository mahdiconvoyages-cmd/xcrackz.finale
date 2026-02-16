-- 🔧 CORRECTION FINALE - Chaque compte est indépendant

-- ========================================
-- ÉTAPE 1: Vérifier si mahdi.convoyages@gmail.com a un profil
-- ========================================

SELECT 
  '1️⃣ Profil mahdi.convoyages existe ?' as question,
  id as user_id,
  email,
  created_at
FROM profiles
WHERE email = 'mahdi.convoyages@gmail.com';

-- ⚠️ Si VIDE → Le compte n'existe pas dans Supabase Auth
-- ⚠️ Si EXISTE → Notez le user_id et passez à l'ÉTAPE 2

-- ========================================
-- ÉTAPE 2: Supprimer les contacts en doublon (garder le bon)
-- ========================================

-- On garde SEULEMENT le contact lié au VRAI profil mahdi.convoyages
-- On supprime les autres

-- ⚠️ DÉCOMMENTEZ cette section SEULEMENT si l'ÉTAPE 1 a trouvé un profil

/*
-- Supprimer le contact lié à mahdi.benamor1994
DELETE FROM contacts 
WHERE id = 'd03c850d-04fd-4611-b9cb-e6533e926366'
  AND email = 'mahdi.convoyages@gmail.com';

-- Supprimer le contact lié à convoiexpress95
DELETE FROM contacts 
WHERE id = '2acca8cd-0bbd-4208-817d-72d5706a20e2'
  AND email = 'mahdi.convoyages@gmail.com';

-- Vérifier qu'il ne reste aucun contact mahdi.convoyages avec mauvais user_id
SELECT 
  '2️⃣ Contacts restants après suppression' as test,
  c.id,
  c.email,
  c.user_id,
  p.email as user_email
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com';

-- Résultat attendu : AUCUN contact OU un seul contact avec le bon user_id
*/

-- ========================================
-- ÉTAPE 3: Créer le BON contact lié au profil mahdi.convoyages
-- ========================================

-- ⚠️ DÉCOMMENTEZ cette section SEULEMENT si l'ÉTAPE 1 a trouvé un profil
-- ⚠️ Remplacez 'VOTRE_USER_ID' par le user_id de l'ÉTAPE 1

/*
INSERT INTO contacts (name, email, user_id, role, phone)
VALUES (
  'mahdi.convoyages@gmail.com',
  'mahdi.convoyages@gmail.com',
  'VOTRE_USER_ID',  -- ⚠️ Remplacez par le user_id de l'ÉTAPE 1
  'driver',
  NULL
)
ON CONFLICT (email) DO UPDATE
SET user_id = EXCLUDED.user_id;

-- Vérifier la création
SELECT 
  '3️⃣ Contact créé/mis à jour' as test,
  c.id,
  c.email,
  c.user_id,
  p.email as user_email
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com';
*/

-- ========================================
-- ÉTAPE 4: Corriger TOUTES les assignations existantes
-- ========================================

-- Mettre à jour toutes les assignations pour utiliser le user_id du profil mahdi.convoyages

-- ⚠️ DÉCOMMENTEZ cette section SEULEMENT si l'ÉTAPE 1 a trouvé un profil
-- ⚠️ Cette requête va corriger toutes les assignations avec mauvais user_id

/*
UPDATE mission_assignments ma
SET user_id = (SELECT id FROM profiles WHERE email = 'mahdi.convoyages@gmail.com')
FROM contacts c
WHERE ma.contact_id = c.id
  AND c.email = 'mahdi.convoyages@gmail.com'
  AND ma.user_id != (SELECT id FROM profiles WHERE email = 'mahdi.convoyages@gmail.com');

-- Vérifier la correction
SELECT 
  '4️⃣ Assignations corrigées' as test,
  COUNT(*) as nombre_assignations_corrigees
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
  AND ma.user_id = (SELECT id FROM profiles WHERE email = 'mahdi.convoyages@gmail.com');
*/

-- ========================================
-- ÉTAPE 5: Vérification finale complète
-- ========================================

-- Vérifier que tout est correct maintenant

/*
SELECT 
  '5️⃣ Vérification finale' as test,
  ma.id as assignation_id,
  m.reference as mission_ref,
  c.email as contact_email,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  p.email as user_email,
  CASE 
    WHEN ma.user_id = (SELECT id FROM profiles WHERE email = 'mahdi.convoyages@gmail.com') 
    THEN '✅ CORRECT'
    ELSE '❌ ENCORE INCORRECT'
  END as statut,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY ma.assigned_at DESC;

-- Résultat attendu : Toutes les lignes doivent avoir statut = '✅ CORRECT'
*/

-- ========================================
-- 📝 INSTRUCTIONS SI LE PROFIL N'EXISTE PAS
-- ========================================

/*
Si l'ÉTAPE 1 n'a trouvé AUCUN profil pour mahdi.convoyages@gmail.com :

1. Aller dans Supabase Dashboard → Authentication → Users
2. Cliquer sur "Add user" → "Create new user"
3. Email: mahdi.convoyages@gmail.com
4. Password: (choisir un mot de passe)
5. Cliquer "Create user"
6. Attendre quelques secondes que le profil soit créé
7. Revenir à l'ÉTAPE 1 de ce script et noter le user_id
8. Décommenter et exécuter les ÉTAPES 2, 3, 4, 5

IMPORTANT : Les assignations existantes seront PERDUES si vous ne faites pas l'ÉTAPE 4 !
Il faudra réassigner les missions manuellement.
*/
