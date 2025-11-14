-- ==========================================
-- 🔍 DIAGNOSTIC - Vérifier les documents et l'accès RLS
-- ==========================================

-- 1. Vérifier le user_id actuel de la session
SELECT auth.uid() as current_user_id;

-- 2. Vérifier tous les documents avec leurs user_id
SELECT 
  id,
  user_id,
  inspection_id,
  document_type,
  document_title,
  created_at
FROM inspection_documents
ORDER BY created_at DESC;

-- 3. Tester la policy SELECT directement
SELECT 
  id,
  user_id,
  inspection_id,
  document_title,
  CASE 
    WHEN user_id = auth.uid() THEN 'Match direct user_id'
    WHEN inspection_id IN (
      SELECT vi.id 
      FROM vehicle_inspections vi
      INNER JOIN missions m ON vi.mission_id = m.id
      WHERE m.user_id = auth.uid()
    ) THEN 'Match via inspection'
    ELSE 'NO MATCH'
  END as access_status
FROM inspection_documents
ORDER BY created_at DESC;

-- 4. Vérifier les missions de l'utilisateur
SELECT 
  m.id as mission_id,
  m.user_id,
  m.reference,
  vi.id as inspection_id,
  COUNT(id_doc.id) as documents_count
FROM missions m
LEFT JOIN vehicle_inspections vi ON vi.mission_id = m.id
LEFT JOIN inspection_documents id_doc ON id_doc.inspection_id = vi.id
WHERE m.user_id = auth.uid()
GROUP BY m.id, m.user_id, m.reference, vi.id
ORDER BY m.created_at DESC;

-- 5. Comparer user_id de la table avec auth.uid()
SELECT 
  COUNT(*) as total_docs,
  COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as docs_matching_auth,
  COUNT(CASE WHEN user_id IS NOT NULL AND user_id != auth.uid() THEN 1 END) as docs_other_users,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as docs_without_user_id
FROM inspection_documents;
