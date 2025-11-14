-- ==========================================
-- 🔄 MISE À JOUR user_id pour TOUS les documents existants
-- Exécuter après UPDATE_INSPECTION_DOCUMENTS_RLS.sql
-- ==========================================

-- 1. Mettre à jour les documents liés à des inspections (via missions)
UPDATE inspection_documents
SET user_id = m.user_id
FROM vehicle_inspections vi
INNER JOIN missions m ON vi.mission_id = m.id
WHERE inspection_documents.inspection_id = vi.id
AND inspection_documents.user_id IS NULL;

-- 2. Afficher les documents sans user_id pour vérification manuelle
SELECT 
  id,
  inspection_id,
  document_type,
  document_title,
  scanned_at,
  created_at
FROM inspection_documents
WHERE user_id IS NULL
ORDER BY created_at DESC;

-- ==========================================
-- ℹ️ Instructions pour les documents orphelins
-- ==========================================
-- Si des documents apparaissent ci-dessus sans user_id:
-- 1. Vérifier s'ils ont un inspection_id valide
-- 2. Si oui, vérifier que l'inspection existe et a une mission
-- 3. Si non, ce sont des "brouillons" - vous devez les assigner manuellement
--
-- Exemple pour assigner un document à un utilisateur spécifique:
-- UPDATE inspection_documents 
-- SET user_id = 'VOTRE_USER_ID_ICI'
-- WHERE id = 'DOCUMENT_ID_ICI';

-- Vérification finale
SELECT 
  CASE 
    WHEN user_id IS NULL THEN 'Sans user_id'
    ELSE 'Avec user_id'
  END as status,
  COUNT(*) as count
FROM inspection_documents
GROUP BY (user_id IS NULL)
ORDER BY status;
