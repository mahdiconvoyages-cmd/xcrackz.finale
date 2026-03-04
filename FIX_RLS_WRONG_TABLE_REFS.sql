-- ============================================================================
-- FIX: Corriger les policies qui référencent la mauvaise table
-- ============================================================================
-- PROBLÈME : Nos policies créées dans FIX_SUPABASE_WARNINGS.sql et
-- FIX_SUPABASE_SECURITY.sql référencent "public.inspections" (table web legacy)
-- Mais les FK pointent vers "public.vehicle_inspections" (table mobile/Flutter)
--
-- inspection_photos_v2.inspection_id  → vehicle_inspections(id)
-- inspection_documents.inspection_id  → vehicle_inspections(id)
-- inspection_pdfs.inspection_id       → vehicle_inspections(id)
--
-- vehicle_inspections a "inspector_id" et "mission_id"
-- missions a "user_id" et "assigned_user_id"
-- ============================================================================

-- ============================================================================
-- 1. FIX inspection_photos_v2 — INSERT
-- ============================================================================
DROP POLICY IF EXISTS ipv2_insert ON public.inspection_photos_v2;

CREATE POLICY ipv2_insert ON public.inspection_photos_v2 FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicle_inspections vi
      JOIN public.missions m ON m.id = vi.mission_id
      WHERE vi.id = inspection_photos_v2.inspection_id
        AND (
          vi.inspector_id = auth.uid()
          OR m.user_id = auth.uid()
          OR m.assigned_user_id = auth.uid()
        )
    )
  );

-- Vérifier que ipv2_select existe toujours (il devrait — on ne l'a pas touché)
-- Si jamais il a été supprimé, on le recrée
DROP POLICY IF EXISTS ipv2_select ON public.inspection_photos_v2;
CREATE POLICY ipv2_select ON public.inspection_photos_v2 FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicle_inspections vi
      JOIN public.missions m ON m.id = vi.mission_id
      WHERE vi.id = inspection_photos_v2.inspection_id
        AND (
          vi.inspector_id = auth.uid()
          OR m.user_id = auth.uid()
          OR m.assigned_user_id = auth.uid()
        )
    )
  );

-- Ajouter UPDATE et DELETE qui manquaient
DROP POLICY IF EXISTS ipv2_update ON public.inspection_photos_v2;
CREATE POLICY ipv2_update ON public.inspection_photos_v2 FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicle_inspections vi
      JOIN public.missions m ON m.id = vi.mission_id
      WHERE vi.id = inspection_photos_v2.inspection_id
        AND (
          vi.inspector_id = auth.uid()
          OR m.user_id = auth.uid()
          OR m.assigned_user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS ipv2_delete ON public.inspection_photos_v2;
CREATE POLICY ipv2_delete ON public.inspection_photos_v2 FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicle_inspections vi
      JOIN public.missions m ON m.id = vi.mission_id
      WHERE vi.id = inspection_photos_v2.inspection_id
        AND (
          vi.inspector_id = auth.uid()
          OR m.user_id = auth.uid()
          OR m.assigned_user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- 2. FIX inspection_documents — INSERT / UPDATE / DELETE / SELECT
-- ============================================================================
DROP POLICY IF EXISTS id_delete ON public.inspection_documents;
DROP POLICY IF EXISTS id_insert ON public.inspection_documents;
DROP POLICY IF EXISTS id_update ON public.inspection_documents;
DROP POLICY IF EXISTS id_select ON public.inspection_documents;

CREATE POLICY id_select ON public.inspection_documents FOR SELECT
  TO authenticated
  USING (
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

CREATE POLICY id_insert ON public.inspection_documents FOR INSERT
  TO authenticated
  WITH CHECK (
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

CREATE POLICY id_update ON public.inspection_documents FOR UPDATE
  TO authenticated
  USING (
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

CREATE POLICY id_delete ON public.inspection_documents FOR DELETE
  TO authenticated
  USING (
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

-- ============================================================================
-- 3. FIX inspection_pdfs — SELECT / INSERT / DELETE
-- ============================================================================
-- inspection_pdfs a à la fois inspection_id (→ vehicle_inspections) 
-- ET mission_id (→ missions). On utilise les deux chemins.
DROP POLICY IF EXISTS "Users can view own inspection pdfs" ON public.inspection_pdfs;
DROP POLICY IF EXISTS "Users can insert own inspection pdfs" ON public.inspection_pdfs;
DROP POLICY IF EXISTS "Users can delete own inspection pdfs" ON public.inspection_pdfs;

CREATE POLICY "Users can view own inspection pdfs" ON public.inspection_pdfs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = inspection_pdfs.mission_id
        AND (m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.vehicle_inspections vi
      JOIN public.missions m ON m.id = vi.mission_id
      WHERE vi.id = inspection_pdfs.inspection_id
        AND (vi.inspector_id = auth.uid() OR m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own inspection pdfs" ON public.inspection_pdfs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = inspection_pdfs.mission_id
        AND (m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.vehicle_inspections vi
      JOIN public.missions m ON m.id = vi.mission_id
      WHERE vi.id = inspection_pdfs.inspection_id
        AND (vi.inspector_id = auth.uid() OR m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own inspection pdfs" ON public.inspection_pdfs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = inspection_pdfs.mission_id
        AND (m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.vehicle_inspections vi
      JOIN public.missions m ON m.id = vi.mission_id
      WHERE vi.id = inspection_pdfs.inspection_id
        AND (vi.inspector_id = auth.uid() OR m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
  );

-- ============================================================================
-- 4. Vérifier que public_tracking_links policies sont correctes
-- ============================================================================
-- Les policies pour public_tracking_links (insert/update via missions.user_id) 
-- sont correctes car public_tracking_links.mission_id → missions(id).
-- Pas de changement nécessaire.

-- ============================================================================
-- 5. SÉCURISER la vue inspection_photos (security_invoker = on)
-- ============================================================================
-- La vue inspection_photos pointe vers inspection_photos_v2 en security_invoker.
-- Avec les nouvelles RLS policies, la vue respectera automatiquement les 
-- policies de l'appelant sur inspection_photos_v2.
-- Rien à faire ici — c'est le comportement voulu.

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Vérifier les policies sur les tables corrigées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('inspection_photos_v2', 'inspection_documents', 'inspection_pdfs')
ORDER BY tablename, cmd;
