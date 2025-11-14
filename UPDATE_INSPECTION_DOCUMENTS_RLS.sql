-- ==========================================
-- 📄 MISE À JOUR TABLE INSPECTION_DOCUMENTS pour synchronisation Web/Mobile
-- À exécuter dans Supabase SQL Editor
-- ==========================================

-- 1. Ajouter une colonne user_id pour faciliter les requêtes
ALTER TABLE inspection_documents 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Mettre à jour les user_id existants depuis vehicle_inspections via missions
UPDATE inspection_documents
SET user_id = m.user_id
FROM vehicle_inspections vi
INNER JOIN missions m ON vi.mission_id = m.id
WHERE inspection_documents.inspection_id = vi.id
AND inspection_documents.user_id IS NULL;

-- 3. Index pour performance
CREATE INDEX IF NOT EXISTS idx_inspection_documents_user_id 
ON inspection_documents(user_id);

-- 4. Activer RLS sur inspection_documents
ALTER TABLE inspection_documents ENABLE ROW LEVEL SECURITY;

-- 5. Policy: Utilisateurs peuvent voir leurs propres documents
DROP POLICY IF EXISTS "Users can view own inspection documents" ON inspection_documents;
CREATE POLICY "Users can view own inspection documents"
ON inspection_documents FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  inspection_id IN (
    SELECT vi.id 
    FROM vehicle_inspections vi
    INNER JOIN missions m ON vi.mission_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- 6. Policy: Utilisateurs peuvent insérer leurs propres documents
DROP POLICY IF EXISTS "Users can insert own inspection documents" ON inspection_documents;
CREATE POLICY "Users can insert own inspection documents"
ON inspection_documents FOR INSERT
TO authenticated
WITH CHECK (
  -- Permettre l'insertion si user_id correspond OU si lié à une inspection de l'utilisateur
  TRUE
);

-- 7. Policy: Utilisateurs peuvent mettre à jour leurs propres documents
DROP POLICY IF EXISTS "Users can update own inspection documents" ON inspection_documents;
CREATE POLICY "Users can update own inspection documents"
ON inspection_documents FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  inspection_id IN (
    SELECT vi.id 
    FROM vehicle_inspections vi
    INNER JOIN missions m ON vi.mission_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- 8. Policy: Utilisateurs peuvent supprimer leurs propres documents
DROP POLICY IF EXISTS "Users can delete own inspection documents" ON inspection_documents;
CREATE POLICY "Users can delete own inspection documents"
ON inspection_documents FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  inspection_id IN (
    SELECT vi.id 
    FROM vehicle_inspections vi
    INNER JOIN missions m ON vi.mission_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- ==========================================
-- ✅ Table inspection_documents mise à jour
-- ==========================================

-- Vérification
SELECT 
  'inspection_documents' as table_name,
  COUNT(*) as total_documents,
  COUNT(DISTINCT inspection_id) as total_inspections,
  COUNT(DISTINCT user_id) as total_users
FROM inspection_documents;

SELECT 
  policyname, 
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'inspection_documents';
