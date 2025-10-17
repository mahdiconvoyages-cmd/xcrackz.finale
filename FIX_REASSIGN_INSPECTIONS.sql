-- 🔄 RÉASSIGNER LES INSPECTIONS AU COMPTE ACTUEL
-- EXÉCUTER SEULEMENT si vous voulez transférer les inspections vers mahdi.convoyages@gmail.com

-- ===============================================
-- OPTION B: Réassigner toutes les inspections de mahdi.benamor1994 vers mahdi.convoyages
-- ===============================================

UPDATE vehicle_inspections
SET inspector_id = 'c37f15d6-545a-4792-9697-de03991b4f17'  -- mahdi.convoyages@gmail.com
WHERE inspector_id = '784dd826-62ae-4d94-81a0-618953d63010'; -- mahdi.benamor1994@gmail.com

-- ===============================================
-- VÉRIFICATION
-- ===============================================
SELECT 
  'INSPECTIONS REASSIGNEES' as status,
  COUNT(*) as total_inspections,
  inspector_id
FROM vehicle_inspections
WHERE inspector_id = 'c37f15d6-545a-4792-9697-de03991b4f17'
GROUP BY inspector_id;