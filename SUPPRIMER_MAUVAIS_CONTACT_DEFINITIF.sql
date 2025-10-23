-- 🔥 FIX DÉFINITIF - Supprimer LE MAUVAIS contact mahdi.convoyages

-- ========================================
-- ÉTAPE 1: Identifier TOUS les contacts mahdi.convoyages
-- ========================================

SELECT 
  '1️⃣ TOUS les contacts mahdi.convoyages' as test,
  c.id as contact_id,
  c.email,
  c.user_id,
  p.email as user_email,
  c.created_at,
  CASE 
    WHEN c.id = 'aa64e37d-c080-4f47-9da2-914b450367e1' THEN '❌ MAUVAIS (utilisé par l''app)'
    WHEN c.id = '3ff37c9e-5bf7-47b4-a6a7-dd1af395ee14' THEN '✅ BON (créé récemment)'
    WHEN c.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ BON user_id'
    ELSE '❌ MAUVAIS user_id'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY c.created_at DESC;

-- ========================================
-- ÉTAPE 2: Supprimer l'assignation avec LE MAUVAIS contact
-- ========================================

DELETE FROM mission_assignments
WHERE contact_id = 'aa64e37d-c080-4f47-9da2-914b450367e1';

SELECT '2️⃣ Assignation avec mauvais contact supprimée' as resultat;

-- ========================================
-- ÉTAPE 3: Supprimer LE MAUVAIS contact (aa64e37d...)
-- ========================================

DELETE FROM contacts
WHERE id = 'aa64e37d-c080-4f47-9da2-914b450367e1'
  AND email = 'mahdi.convoyages@gmail.com';

SELECT '3️⃣ Mauvais contact supprimé' as resultat;

-- ========================================
-- ÉTAPE 4: Vérification finale
-- ========================================

SELECT 
  '4️⃣ Contact restant' as test,
  c.id as contact_id,
  c.email,
  c.user_id,
  p.email as user_email,
  CASE 
    WHEN c.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' AND p.email = 'mahdi.convoyages@gmail.com' 
    THEN '✅ PARFAIT'
    ELSE '❌ PROBLÈME'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com';

-- Résultat attendu: 1 seule ligne avec statut ✅ PARFAIT

SELECT 
  '4️⃣ Nombre de contacts mahdi.convoyages' as test,
  COUNT(*) as total
FROM contacts
WHERE email = 'mahdi.convoyages@gmail.com';

-- Résultat attendu: 1

SELECT 
  '4️⃣ Assignations restantes' as test,
  COUNT(*) as total
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = 'mahdi.convoyages@gmail.com';

-- Résultat attendu: 0 (vous réassignerez)
