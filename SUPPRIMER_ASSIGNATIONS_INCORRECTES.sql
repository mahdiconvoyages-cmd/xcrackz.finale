-- 🗑️ SUPPRESSION SIMPLE - Assignations incorrectes mahdi.convoyages

-- ========================================
-- ÉTAPE 1: Voir ce qu'on va supprimer
-- ========================================

SELECT 
  '1️⃣ Assignations à supprimer' as info,
  ma.id,
  m.reference,
  c.email as contact_email,
  ma.user_id as mauvais_user_id,
  p.email as mauvais_user_email,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
  AND ma.user_id != 'c37f15d6-545a-4792-9697-de03991b4f17';

-- ========================================
-- ÉTAPE 2: Supprimer les assignations incorrectes
-- ========================================

DELETE FROM mission_assignments
WHERE id IN (
  SELECT ma.id
  FROM mission_assignments ma
  JOIN contacts c ON c.id = ma.contact_id
  WHERE c.email = 'mahdi.convoyages@gmail.com'
    AND ma.user_id != 'c37f15d6-545a-4792-9697-de03991b4f17'
);

-- ========================================
-- ÉTAPE 3: Vérification après suppression
-- ========================================

SELECT 
  '3️⃣ Assignations restantes' as info,
  COUNT(*) as total
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = 'mahdi.convoyages@gmail.com';

-- Résultat attendu: 0 (tout supprimé, vous réassignerez avec le nouveau code)
