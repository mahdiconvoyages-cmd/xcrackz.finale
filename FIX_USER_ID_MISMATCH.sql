-- ==========================================
-- 🔧 CORRECTION RAPIDE - Assigner les documents à l'utilisateur actuel
-- ==========================================

-- 1. Afficher votre user_id actuel
SELECT auth.uid() as mon_user_id;

-- 2. Afficher les user_id actuels des documents
SELECT DISTINCT user_id, COUNT(*) as count
FROM inspection_documents
GROUP BY user_id;

-- 3. SOLUTION A : Réassigner TOUS les documents à l'utilisateur connecté (RECOMMANDÉ)
-- ⚠️ Décommentez cette ligne après avoir vérifié les résultats ci-dessus
UPDATE inspection_documents SET user_id = auth.uid();

-- 4. SOLUTION B : Réassigner seulement les documents d'une mission spécifique
-- ⚠️ Remplacez MISSION_ID par l'ID de votre mission
-- UPDATE inspection_documents 
-- SET user_id = auth.uid()
-- WHERE inspection_id IN (
--   SELECT vi.id FROM vehicle_inspections vi
--   INNER JOIN missions m ON vi.mission_id = m.id
--   WHERE m.id = 'MISSION_ID'
-- );

-- 5. Vérification après correction
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as mes_documents
FROM inspection_documents;
