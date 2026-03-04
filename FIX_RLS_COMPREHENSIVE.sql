-- ============================================================================
-- FIX COMPLET : Toutes les policies RLS cassées ou trop restrictives
-- ============================================================================
-- Causé par : les changements RLS précédents + policies existantes insuffisantes
-- Tables affectées :
--   1. vehicle_inspections — SELECT trop restrictif (inspector_id only)
--   2. inspection_report_shares — SELECT trop restrictif (user_id only)
--   3. inspection_damages — pas de policies ?
--   4. Vérification globale
-- ============================================================================

-- ============================================================================
-- 1. vehicle_inspections — Élargir SELECT/UPDATE pour mission owner + assigned
-- ============================================================================
-- Actuellement: vi_select = inspector_id = auth.uid() SEULEMENT
-- Problème: le propriétaire de la mission (.eq('mission_id', ...)) ne voit rien
-- Fix: autoriser aussi mission.user_id et mission.assigned_user_id

DROP POLICY IF EXISTS vi_select ON public.vehicle_inspections;
CREATE POLICY vi_select ON public.vehicle_inspections FOR SELECT
  TO authenticated
  USING (
    inspector_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = vehicle_inspections.mission_id
        AND (m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS vi_insert ON public.vehicle_inspections;
CREATE POLICY vi_insert ON public.vehicle_inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    inspector_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = vehicle_inspections.mission_id
        AND (m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS vi_update ON public.vehicle_inspections;
CREATE POLICY vi_update ON public.vehicle_inspections FOR UPDATE
  TO authenticated
  USING (
    inspector_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = vehicle_inspections.mission_id
        AND (m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
  );

-- Ajouter DELETE (manquait)
DROP POLICY IF EXISTS vi_delete ON public.vehicle_inspections;
CREATE POLICY vi_delete ON public.vehicle_inspections FOR DELETE
  TO authenticated
  USING (
    inspector_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = vehicle_inspections.mission_id
        AND (m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
  );

-- ============================================================================
-- 2. inspection_report_shares — Élargir SELECT pour mission owner
-- ============================================================================
-- Actuellement: irs_select = user_id = auth.uid()
-- Problème: le code Flutter fait .eq('mission_id', ...) sans filtre user_id
-- Fix: autoriser aussi les propriétaires/assignés de la mission

DROP POLICY IF EXISTS irs_select ON public.inspection_report_shares;
CREATE POLICY irs_select ON public.inspection_report_shares FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = inspection_report_shares.mission_id
        AND (m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
  );

-- irs_insert reste OK (user_id = auth.uid() — on insère avec son propre user_id)
-- irs_update reste OK (user_id = auth.uid())
-- irs_public_read (anon SELECT) reste OK

-- ============================================================================
-- 3. inspection_damages — Vérifier et créer si nécessaire
-- ============================================================================
-- inspection_damages est utilisé dans les rapports (get_public_report_data)
-- et potentiellement en écriture depuis Flutter

-- D'abord vérifier si RLS est activé
DO $$
BEGIN
  -- Activer RLS si pas déjà fait
  EXECUTE 'ALTER TABLE public.inspection_damages ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table inspection_damages does not exist, skipping';
END;
$$;

-- Policies pour inspection_damages (via vehicle_inspections → missions)
DROP POLICY IF EXISTS id_damages_select ON public.inspection_damages;
DROP POLICY IF EXISTS id_damages_insert ON public.inspection_damages;
DROP POLICY IF EXISTS id_damages_update ON public.inspection_damages;
DROP POLICY IF EXISTS id_damages_delete ON public.inspection_damages;

DO $$
BEGIN
  -- SELECT
  EXECUTE '
    CREATE POLICY id_damages_select ON public.inspection_damages FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.vehicle_inspections vi
          JOIN public.missions m ON m.id = vi.mission_id
          WHERE vi.id = inspection_damages.inspection_id
            AND (
              vi.inspector_id = auth.uid()
              OR m.user_id = auth.uid()
              OR m.assigned_user_id = auth.uid()
            )
        )
      )
  ';
  -- INSERT
  EXECUTE '
    CREATE POLICY id_damages_insert ON public.inspection_damages FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.vehicle_inspections vi
          JOIN public.missions m ON m.id = vi.mission_id
          WHERE vi.id = inspection_damages.inspection_id
            AND (
              vi.inspector_id = auth.uid()
              OR m.user_id = auth.uid()
              OR m.assigned_user_id = auth.uid()
            )
        )
      )
  ';
  -- UPDATE
  EXECUTE '
    CREATE POLICY id_damages_update ON public.inspection_damages FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.vehicle_inspections vi
          JOIN public.missions m ON m.id = vi.mission_id
          WHERE vi.id = inspection_damages.inspection_id
            AND (
              vi.inspector_id = auth.uid()
              OR m.user_id = auth.uid()
              OR m.assigned_user_id = auth.uid()
            )
        )
      )
  ';
  -- DELETE
  EXECUTE '
    CREATE POLICY id_damages_delete ON public.inspection_damages FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.vehicle_inspections vi
          JOIN public.missions m ON m.id = vi.mission_id
          WHERE vi.id = inspection_damages.inspection_id
            AND (
              vi.inspector_id = auth.uid()
              OR m.user_id = auth.uid()
              OR m.assigned_user_id = auth.uid()
            )
        )
      )
  ';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table inspection_damages does not exist, skipping policies';
END;
$$;

-- ============================================================================
-- 4. Vérification globale — tables avec RLS activé mais SANS policies
-- ============================================================================
SELECT
  t.schemaname,
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COALESCE(p.policy_count, 0) AS policy_count
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND COALESCE(p.policy_count, 0) = 0
ORDER BY t.tablename;

-- RÉSULTAT ATTENDU : 0 lignes (aucune table avec RLS sans policies)

-- ============================================================================
-- 5. Vérification — policies de vehicle_inspections
-- ============================================================================
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'vehicle_inspections'
ORDER BY cmd;

-- ============================================================================
-- 6. Vérification — policies de inspection_report_shares
-- ============================================================================
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'inspection_report_shares'
ORDER BY cmd;
