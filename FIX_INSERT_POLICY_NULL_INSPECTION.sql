-- ==========================================
-- 🔧 FIX POLICY INSERT - PERMETTRE NULL inspection_id
-- ==========================================
-- Correction pour accepter les documents standalone

DROP POLICY IF EXISTS "Users insert own documents" ON inspection_documents;

CREATE POLICY "Users insert own documents"
ON inspection_documents
FOR INSERT
WITH CHECK (
  -- Peut créer des documents pour:
  -- 1. Lui-même (scans standalone sans inspection)
  (user_id = auth.uid() AND inspection_id IS NULL)
  OR
  -- 2. Inspections qu'il a créées
  (user_id = auth.uid() AND inspection_id IN (
    SELECT vi.id 
    FROM vehicle_inspections vi
    WHERE vi.inspector_id = auth.uid()
  ))
  OR
  -- 3. Inspections de ses missions
  (inspection_id IN (
    SELECT vi.id 
    FROM vehicle_inspections vi
    INNER JOIN missions m ON vi.mission_id = m.id
    WHERE m.user_id = auth.uid() OR m.assigned_user_id = auth.uid()
  ))
);

-- Vérifier la policy créée
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'inspection_documents'
  AND cmd = 'INSERT';
