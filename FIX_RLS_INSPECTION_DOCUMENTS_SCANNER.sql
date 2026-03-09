-- ============================================================================
-- FIX RLS inspection_documents — Scanner standalone + inspection liée
-- ============================================================================
-- Problème : INSERT bloqué quand inspection_id IS NULL (scans standalone)
-- Solution : Supprimer TOUTES les anciennes policies et recréer proprement
-- ============================================================================

-- 1. Ajouter user_id si absent
ALTER TABLE public.inspection_documents 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.inspection_documents 
ADD COLUMN IF NOT EXISTS extracted_text TEXT;

-- 2. Supprimer TOUTES les anciennes policies conflictuelles
DROP POLICY IF EXISTS "Documents - SELECT own or assigned" ON public.inspection_documents;
DROP POLICY IF EXISTS "Documents - INSERT own or assigned" ON public.inspection_documents;
DROP POLICY IF EXISTS "Documents - DELETE own or assigned" ON public.inspection_documents;
DROP POLICY IF EXISTS "Users insert own documents" ON public.inspection_documents;
DROP POLICY IF EXISTS id_select ON public.inspection_documents;
DROP POLICY IF EXISTS id_insert ON public.inspection_documents;
DROP POLICY IF EXISTS id_update ON public.inspection_documents;
DROP POLICY IF EXISTS id_delete ON public.inspection_documents;

-- 3. S'assurer que RLS est activé
ALTER TABLE public.inspection_documents ENABLE ROW LEVEL SECURITY;

-- 4. SELECT : voir ses propres docs (standalone ou via inspection/mission)
CREATE POLICY "inspection_docs_select" ON public.inspection_documents
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_documents.inspection_id
      AND (
        vi.inspector_id = auth.uid()
        OR m.user_id = auth.uid()
        OR m.assigned_user_id = auth.uid()
      )
  )
);

-- 5. INSERT : créer un doc standalone (user_id) OU lié à une inspection
CREATE POLICY "inspection_docs_insert" ON public.inspection_documents
FOR INSERT TO authenticated
WITH CHECK (
  -- Standalone scan (pas d'inspection, juste user_id)
  (user_id = auth.uid() AND inspection_id IS NULL)
  OR
  -- Lié à une inspection qu'on possède/gère
  (
    inspection_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.vehicle_inspections vi
      JOIN public.missions m ON m.id = vi.mission_id
      WHERE vi.id = inspection_documents.inspection_id
        AND (
          vi.inspector_id = auth.uid()
          OR m.user_id = auth.uid()
          OR m.assigned_user_id = auth.uid()
        )
    )
  )
);

-- 6. UPDATE : modifier ses propres docs
CREATE POLICY "inspection_docs_update" ON public.inspection_documents
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_documents.inspection_id
      AND (
        vi.inspector_id = auth.uid()
        OR m.user_id = auth.uid()
        OR m.assigned_user_id = auth.uid()
      )
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_documents.inspection_id
      AND (
        vi.inspector_id = auth.uid()
        OR m.user_id = auth.uid()
        OR m.assigned_user_id = auth.uid()
      )
  )
);

-- 7. DELETE : supprimer ses propres docs
CREATE POLICY "inspection_docs_delete" ON public.inspection_documents
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_documents.inspection_id
      AND (
        vi.inspector_id = auth.uid()
        OR m.user_id = auth.uid()
        OR m.assigned_user_id = auth.uid()
      )
  )
);

-- 8. Index pour performance
CREATE INDEX IF NOT EXISTS idx_inspection_documents_user_id 
ON public.inspection_documents(user_id);

SELECT 'RLS inspection_documents corrigé — scanner opérationnel' as result;
