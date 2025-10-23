-- 🔥 CORRECTION URGENTE - Forcer le bon contact mahdi.convoyages

-- ========================================
-- ÉTAPE 1: Voir l'état actuel
-- ========================================

SELECT 
  '1️⃣ Contacts mahdi.convoyages actuels' as test,
  c.id as contact_id,
  c.email,
  c.user_id,
  p.email as user_email,
  c.created_at,
  CASE 
    WHEN c.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ BON'
    ELSE '❌ MAUVAIS'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY c.created_at DESC;

-- ========================================
-- ÉTAPE 2: Supprimer l'assignation incorrecte
-- ========================================

DELETE FROM mission_assignments
WHERE contact_id IN (
  SELECT id FROM contacts 
  WHERE email = 'mahdi.convoyages@gmail.com'
);

SELECT '2️⃣ Assignation supprimée' as resultat;

-- ========================================
-- ÉTAPE 3: Supprimer TOUS les contacts mahdi.convoyages
-- ========================================

DELETE FROM contacts
WHERE email = 'mahdi.convoyages@gmail.com';

SELECT '3️⃣ Contacts supprimés' as resultat;

-- ========================================
-- ÉTAPE 4: Recréer LE BON contact
-- ========================================

INSERT INTO contacts (name, email, user_id, role, phone, is_active)
VALUES (
  'mahdi.convoyages@gmail.com',
  'mahdi.convoyages@gmail.com',
  'c37f15d6-545a-4792-9697-de03991b4f17',  -- ✅ LE BON user_id
  'driver',
  NULL,
  true
);

SELECT '4️⃣ Contact recréé avec BON user_id' as resultat;

-- ========================================
-- ÉTAPE 5: Vérification finale
-- ========================================

SELECT 
  '5️⃣ Vérification' as test,
  c.id as contact_id,
  c.email,
  c.user_id,
  p.email as user_email,
  CASE 
    WHEN c.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' AND p.email = 'mahdi.convoyages@gmail.com' 
    THEN '✅ PARFAIT'
    ELSE '❌ ENCORE INCORRECT'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com';

-- Résultat attendu: 1 ligne, statut = ✅ PARFAIT
