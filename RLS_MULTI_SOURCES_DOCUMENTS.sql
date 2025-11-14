-- ==========================================
-- 🔐 RLS MULTI-SOURCES POUR DOCUMENTS
-- ==========================================
-- Chaque utilisateur voit:
-- 1. Ses propres scans (user_id = auth.uid())
-- 2. Documents des inspections qu'il a créées (inspector_id)
-- 3. Documents des inspections de missions qu'il a créées (mission owner)
-- 4. Documents des inspections de missions assignées à lui
-- ==========================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view own documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON inspection_documents;

-- ==========================================
-- 📖 POLICY SELECT (Lecture)
-- ==========================================
CREATE POLICY "Users view own and assigned inspection documents"
ON inspection_documents
FOR SELECT
USING (
  -- 1. Documents standalone de l'utilisateur
  user_id = auth.uid()
  OR
  -- 2. Documents liés aux inspections
  inspection_id IN (
    SELECT vi.id 
    FROM vehicle_inspections vi
    WHERE 
      -- 2a. Inspections créées par l'utilisateur
      vi.inspector_id = auth.uid()
      OR
      -- 2b. Inspections de missions créées par l'utilisateur
      vi.mission_id IN (
        SELECT m.id FROM missions m WHERE m.user_id = auth.uid()
      )
      OR
      -- 2c. Inspections de missions assignées à l'utilisateur
      vi.mission_id IN (
        SELECT m.id FROM missions m WHERE m.assigned_user_id = auth.uid()
      )
  )
);

-- ==========================================
-- ➕ POLICY INSERT (Création)
-- ==========================================
CREATE POLICY "Users insert own documents"
ON inspection_documents
FOR INSERT
WITH CHECK (
  -- Peut créer des documents pour:
  -- 1. Lui-même (scans standalone)
  user_id = auth.uid()
  OR
  -- 2. Inspections qu'il a créées
  inspection_id IN (
    SELECT vi.id 
    FROM vehicle_inspections vi
    WHERE vi.inspector_id = auth.uid()
  )
  OR
  -- 3. Inspections de ses missions
  inspection_id IN (
    SELECT vi.id 
    FROM vehicle_inspections vi
    INNER JOIN missions m ON vi.mission_id = m.id
    WHERE m.user_id = auth.uid() OR m.assigned_user_id = auth.uid()
  )
);

-- ==========================================
-- ✏️ POLICY UPDATE (Modification)
-- ==========================================
CREATE POLICY "Users update own documents"
ON inspection_documents
FOR UPDATE
USING (
  user_id = auth.uid()
  OR
  inspection_id IN (
    SELECT vi.id 
    FROM vehicle_inspections vi
    INNER JOIN missions m ON vi.mission_id = m.id
    WHERE vi.inspector_id = auth.uid() 
       OR m.user_id = auth.uid() 
       OR m.assigned_user_id = auth.uid()
  )
);

-- ==========================================
-- 🗑️ POLICY DELETE (Suppression)
-- ==========================================
CREATE POLICY "Users delete own documents"
ON inspection_documents
FOR DELETE
USING (
  user_id = auth.uid()
  OR
  inspection_id IN (
    SELECT vi.id 
    FROM vehicle_inspections vi
    INNER JOIN missions m ON vi.mission_id = m.id
    WHERE vi.inspector_id = auth.uid() 
       OR m.user_id = auth.uid()
  )
);

-- ==========================================
-- ✅ VÉRIFICATION
-- ==========================================

-- Test: Combien de documents je peux voir?
SELECT 
  COUNT(*) as total_documents_visibles,
  COUNT(DISTINCT CASE WHEN user_id = auth.uid() THEN id END) as mes_scans_standalone,
  COUNT(DISTINCT CASE WHEN inspection_id IS NOT NULL THEN id END) as scans_inspections
FROM inspection_documents;

-- Test: Détail des documents visibles
SELECT 
  id.id,
  id.document_title,
  id.document_type,
  id.created_at,
  CASE 
    WHEN id.user_id = auth.uid() THEN 'Mon scan standalone'
    WHEN id.inspection_id IS NOT NULL THEN 'Scan d''inspection'
    ELSE 'Autre'
  END as source,
  p.email as proprietaire
FROM inspection_documents id
LEFT JOIN profiles p ON p.id = id.user_id
ORDER BY id.created_at DESC;
