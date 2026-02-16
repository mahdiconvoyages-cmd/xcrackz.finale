-- ================================================================
-- AJOUT DOCUMENTS SCANNÉS ET FRAIS POUR INSPECTIONS D'ARRIVÉE
-- ================================================================
-- DATE: 2025-11-07
-- OBJECTIF: Permettre de scanner des documents et enregistrer des frais
--           lors de l'inspection d'arrivée
-- ================================================================

-- ================================================
-- TABLE 1: inspection_documents (Documents scannés)
-- ================================================
CREATE TABLE IF NOT EXISTS public.inspection_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.vehicle_inspections(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'delivery_receipt', 'damage_report', 'other'
  document_title TEXT NOT NULL,
  document_url TEXT NOT NULL, -- URL du document scanné (PDF ou image)
  pages_count INTEGER DEFAULT 1,
  file_size_kb INTEGER, -- Taille en Ko
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_inspection_documents_inspection_id 
ON public.inspection_documents(inspection_id);

CREATE INDEX IF NOT EXISTS idx_inspection_documents_type 
ON public.inspection_documents(document_type);

-- Commentaires
COMMENT ON TABLE public.inspection_documents IS 'Documents scannés lors des inspections (PV livraison, rapports dommages, etc.)';
COMMENT ON COLUMN public.inspection_documents.document_type IS 'Type: delivery_receipt (PV livraison), damage_report (constat dommages), other (autre)';
COMMENT ON COLUMN public.inspection_documents.document_url IS 'URL publique du document stocké dans Supabase Storage';

-- ================================================
-- TABLE 2: inspection_expenses (Frais de mission)
-- ================================================
CREATE TABLE IF NOT EXISTS public.inspection_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.vehicle_inspections(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('carburant', 'peage', 'transport', 'imprevu')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0), -- Montant en euros
  description TEXT, -- Description du frais
  receipt_url TEXT, -- URL du justificatif scanné (optionnel)
  receipt_pages_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_inspection_expenses_inspection_id 
ON public.inspection_expenses(inspection_id);

CREATE INDEX IF NOT EXISTS idx_inspection_expenses_type 
ON public.inspection_expenses(expense_type);

-- Commentaires
COMMENT ON TABLE public.inspection_expenses IS 'Frais engagés pendant la mission (carburant, péages, etc.)';
COMMENT ON COLUMN public.inspection_expenses.expense_type IS 'Type de frais: carburant, peage, transport, imprevu';
COMMENT ON COLUMN public.inspection_expenses.amount IS 'Montant en euros (ex: 45.50)';
COMMENT ON COLUMN public.inspection_expenses.receipt_url IS 'URL du justificatif scanné (ticket, facture)';

-- ================================================
-- RLS (Row Level Security)
-- ================================================

-- Documents
ALTER TABLE public.inspection_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Documents - SELECT own or assigned" ON public.inspection_documents;
CREATE POLICY "Documents - SELECT own or assigned"
ON public.inspection_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_documents.inspection_id
      AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Documents - INSERT own or assigned" ON public.inspection_documents;
CREATE POLICY "Documents - INSERT own or assigned"
ON public.inspection_documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_documents.inspection_id
      AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Documents - DELETE own or assigned" ON public.inspection_documents;
CREATE POLICY "Documents - DELETE own or assigned"
ON public.inspection_documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_documents.inspection_id
      AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- Frais
ALTER TABLE public.inspection_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Expenses - SELECT own or assigned" ON public.inspection_expenses;
CREATE POLICY "Expenses - SELECT own or assigned"
ON public.inspection_expenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_expenses.inspection_id
      AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Expenses - INSERT own or assigned" ON public.inspection_expenses;
CREATE POLICY "Expenses - INSERT own or assigned"
ON public.inspection_expenses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_expenses.inspection_id
      AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Expenses - UPDATE own or assigned" ON public.inspection_expenses;
CREATE POLICY "Expenses - UPDATE own or assigned"
ON public.inspection_expenses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_expenses.inspection_id
      AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Expenses - DELETE own or assigned" ON public.inspection_expenses;
CREATE POLICY "Expenses - DELETE own or assigned"
ON public.inspection_expenses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_inspections vi
    JOIN public.missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_expenses.inspection_id
      AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- ================================================
-- STORAGE BUCKET pour documents
-- ================================================

-- Créer le bucket si nécessaire
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-documents', 'inspection-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies Storage
DROP POLICY IF EXISTS "Documents upload" ON storage.objects;
CREATE POLICY "Documents upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-documents'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Documents read" ON storage.objects;
CREATE POLICY "Documents read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'inspection-documents');

DROP POLICY IF EXISTS "Documents delete" ON storage.objects;
CREATE POLICY "Documents delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-documents'
  AND auth.role() = 'authenticated'
);

-- ================================================
-- VÉRIFICATION FINALE
-- ================================================
SELECT 
  '✅ Tables créées' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'inspection_documents') as table_documents,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'inspection_expenses') as table_expenses,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'inspection_documents') as policies_documents,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'inspection_expenses') as policies_expenses,
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'inspection-documents') as bucket_created;

-- ================================================================
-- RÉSUMÉ
-- ================================================================
-- ✅ Table inspection_documents: Documents scannés avec URL PDF
-- ✅ Table inspection_expenses: Frais avec justificatifs
-- ✅ RLS activé sur les deux tables
-- ✅ Storage bucket "inspection-documents" créé
-- ✅ Indexes pour performance
-- ================================================================
