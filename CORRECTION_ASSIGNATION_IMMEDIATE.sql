-- 🔧 CORRECTION ASSIGNATION EXISTANTE - mahdi.convoyages@gmail.com

-- ========================================
-- ÉTAPE 1: Corriger l'assignation existante
-- ========================================

-- Obtenir l'ID du bon contact
WITH bon_contact AS (
  SELECT id FROM contacts 
  WHERE email = 'mahdi.convoyages@gmail.com' 
    AND user_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
  LIMIT 1
)
-- Mettre à jour l'assignation avec le BON user_id
UPDATE mission_assignments
SET 
  user_id = 'c37f15d6-545a-4792-9697-de03991b4f17',
  contact_id = (SELECT id FROM bon_contact)
WHERE id = (
  SELECT ma.id 
  FROM mission_assignments ma
  JOIN missions m ON m.id = ma.mission_id
  WHERE m.reference = 'MISSION-1760719396661'
  LIMIT 1
);

-- ========================================
-- ÉTAPE 2: Vérification
-- ========================================

SELECT 
  '✅ Vérification après correction' as test,
  m.reference,
  c.email as contact_email,
  ma.user_id,
  p.email as user_email,
  ma.assigned_at,
  CASE 
    WHEN ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN '✅ CORRIGÉ'
    ELSE '❌ Encore incorrect'
  END as statut
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
WHERE m.reference = 'MISSION-1760719396661';

-- ========================================
-- ÉTAPE 3: Corriger TOUTES les anciennes assignations incorrectes
-- ========================================

-- Obtenir l'ID du bon contact
WITH bon_contact AS (
  SELECT id FROM contacts 
  WHERE email = 'mahdi.convoyages@gmail.com' 
    AND user_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
  LIMIT 1
)
-- Corriger TOUTES les assignations avec mauvais user_id
UPDATE mission_assignments ma
SET 
  user_id = 'c37f15d6-545a-4792-9697-de03991b4f17',
  contact_id = (SELECT id FROM bon_contact)
FROM contacts c
WHERE ma.contact_id = c.id
  AND c.email = 'mahdi.convoyages@gmail.com'
  AND ma.user_id != 'c37f15d6-545a-4792-9697-de03991b4f17';

-- ========================================
-- ÉTAPE 4: Résumé final
-- ========================================

SELECT 
  '📊 Résumé final' as test,
  COUNT(*) as total_assignations,
  SUM(CASE WHEN ma.user_id = 'c37f15d6-545a-4792-9697-de03991b4f17' THEN 1 ELSE 0 END) as correctes,
  SUM(CASE WHEN ma.user_id != 'c37f15d6-545a-4792-9697-de03991b4f17' THEN 1 ELSE 0 END) as incorrectes
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = 'mahdi.convoyages@gmail.com';

-- Résultat attendu: correctes = total_assignations, incorrectes = 0
