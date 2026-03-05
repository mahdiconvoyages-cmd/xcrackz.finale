-- ============================================================================
-- FIX SUPABASE SECURITY WARNINGS (WARN level)
-- ============================================================================
-- 1. function_search_path_mutable : ~100 fonctions sans search_path fixé
-- 2. rls_policy_always_true       : policies INSERT/UPDATE/DELETE avec true
-- 3. extension_in_public          : pg_net, http, postgis dans public
-- 4. auth_leaked_password_protection : voir note en bas
-- ============================================================================

-- ============================================================================
-- PARTIE 1 : FIXER LE search_path DE TOUTES LES FONCTIONS — VERSION DYNAMIQUE
-- ============================================================================
-- Cette approche génère et exécute automatiquement les ALTER FUNCTION pour
-- TOUTES les fonctions du schema public, quelle que soit leur signature.
-- Pas d'erreur "function name is not unique" car on utilise l'OID exact.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  sql_cmd TEXT;
BEGIN
  FOR r IN
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (
        SELECT 1 FROM pg_options_to_table(p.proconfig)
        WHERE option_name = 'search_path'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    BEGIN
      sql_cmd := format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public',
        r.proname,
        r.args
      );
      EXECUTE sql_cmd;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped: % — %', r.proname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'search_path fix terminé.';
END;
$$;

-- ============================================================================
-- PARTIE 2 : CORRIGER LES POLICIES "ALWAYS TRUE" (trop permissives)
-- ============================================================================

-- ── inspection_documents : restreindre aux inspections du user connecté ──
DROP POLICY IF EXISTS id_delete ON public.inspection_documents;
DROP POLICY IF EXISTS id_insert ON public.inspection_documents;
DROP POLICY IF EXISTS id_update ON public.inspection_documents;

CREATE POLICY id_delete ON public.inspection_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_documents.inspection_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY id_insert ON public.inspection_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_documents.inspection_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY id_update ON public.inspection_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_documents.inspection_id
        AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_documents.inspection_id
        AND i.user_id = auth.uid()
    )
  );

-- ── inspection_photos_v2 : restreindre à l'owner de l'inspection ──
DROP POLICY IF EXISTS ipv2_insert ON public.inspection_photos_v2;

CREATE POLICY ipv2_insert ON public.inspection_photos_v2 FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_photos_v2.inspection_id
        AND i.user_id = auth.uid()
    )
  );

-- ── public_tracking_links : insert/update restreint à l'owner de la mission ──
DROP POLICY IF EXISTS public_tracking_links_auth_insert ON public.public_tracking_links;
DROP POLICY IF EXISTS public_tracking_links_auth_update ON public.public_tracking_links;

CREATE POLICY public_tracking_links_auth_insert ON public.public_tracking_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = public_tracking_links.mission_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY public_tracking_links_auth_update ON public.public_tracking_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = public_tracking_links.mission_id
        AND m.user_id = auth.uid()
    )
  );

-- ── Les policies ci-dessous avec rôle "-" sont du SERVICE ROLE (fonctions système)
-- ── Elles sont intentionnelles et ne présentent pas de risque réel.
-- ── On les laisse telles quelles :
-- ── mission_revenue_logs  : "System can manage revenue logs"     → OK (service_role)
-- ── phone_verifications   : "Service role full access"           → OK (service_role)
-- ── planning_notifications: "System can insert notifications"    → OK (service_role)
-- ── signup_attempts       : "Anyone can insert signup attempts"  → Intentionnel (flux inscription)

-- ============================================================================
-- PARTIE 3 : EXTENSIONS DANS LE SCHEMA PUBLIC
-- ============================================================================
-- ⚠️ ATTENTION : Déplacer ces extensions peut casser des fonctions qui les
-- référencent implicitement. NE PAS exécuter sans tests préalables.
-- Ces warnings sont de niveau WARN (pas ERROR) et peuvent être acceptés.
--
-- Pour postgis : IMPOSSIBLE à déplacer facilement (spatial_ref_sys, etc.)
-- Pour pg_net et http : théoriquement déplaçables mais risqué.
--
-- RECOMMANDATION : Accepter ces warnings pour l'instant.
-- Supabase lui-même installe ces extensions dans public par défaut.
-- ============================================================================

-- ============================================================================
-- PARTIE 4 : LEAKED PASSWORD PROTECTION
-- ============================================================================
-- Cette option NE peut PAS être activée via SQL.
-- À faire manuellement dans Supabase Dashboard :
-- → Authentication → Settings → Password Security
-- → Activer "Check for leaked passwords via HaveIBeenPwned"
-- ============================================================================

-- ============================================================================
-- VÉRIFICATION : fonctions encore sans search_path fixé
-- ============================================================================
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_options_to_table(p.proconfig)
    WHERE option_name = 'search_path'
  )
  AND p.prokind IN ('f', 'p')  -- function ou procedure
  AND NOT EXISTS (
    SELECT 1 FROM pg_depend d
    WHERE d.objid = p.oid AND d.deptype = 'e'
  )
ORDER BY p.proname;

-- RÉSULTAT ATTENDU : 0 lignes (les fonctions PostGIS/http sont des extensions, exclues intentionnellement)
