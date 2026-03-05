-- ============================================================================
-- FIX SUPABASE SECURITY LINTER ERRORS
-- ============================================================================
-- Problèmes détectés :
--   1. policy_exists_rls_disabled : RLS policies créées mais RLS non activé
--   2. rls_disabled_in_public     : Tables publiques sans RLS
--   3. security_definer_view      : Vues avec SECURITY DEFINER (risque)
-- ============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================================

-- ============================================================================
-- PARTIE 1 : ACTIVER RLS SUR TOUTES LES TABLES CONCERNÉES
-- ============================================================================

ALTER TABLE public.account_creation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_calendar     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpooling_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpooling_trips          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.covoiturage_trips         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_location_points       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_tracking_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_pdfs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_locations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_revenue_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_grids             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_quote_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_tokens          ENABLE ROW LEVEL SECURITY;

-- NOTE: spatial_ref_sys est une table système PostGIS — ne pas activer RLS dessus.

-- ============================================================================
-- PARTIE 2 : POLICIES MANQUANTES POUR LES NOUVELLES TABLES
-- ============================================================================
-- Ces tables n'avaient pas encore de policies  → on en crée des sécurisées.

-- quote_items : liés aux quotes du même utilisateur
DROP POLICY IF EXISTS "Users can view own quote items"   ON public.quote_items;
DROP POLICY IF EXISTS "Users can manage own quote items" ON public.quote_items;

CREATE POLICY "Users can view own quote items"
  ON public.quote_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_items.quote_id
        AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own quote items"
  ON public.quote_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_items.quote_id
        AND quotes.user_id = auth.uid()
    )
  );

-- inspection_pdfs : liés aux inspections du même utilisateur
DROP POLICY IF EXISTS "Users can view own inspection pdfs"   ON public.inspection_pdfs;
DROP POLICY IF EXISTS "Users can insert own inspection pdfs" ON public.inspection_pdfs;
DROP POLICY IF EXISTS "Users can delete own inspection pdfs" ON public.inspection_pdfs;

CREATE POLICY "Users can view own inspection pdfs"
  ON public.inspection_pdfs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = inspection_pdfs.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own inspection pdfs"
  ON public.inspection_pdfs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = inspection_pdfs.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own inspection pdfs"
  ON public.inspection_pdfs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = inspection_pdfs.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PARTIE 3 : CORRIGER LES VUES SECURITY DEFINER → SECURITY INVOKER
-- ============================================================================
-- PostgreSQL 15+ (Supabase) supporte ALTER VIEW ... SET (security_invoker = on)
-- Cela force la vue à s'exécuter avec les droits de l'APPELANT, pas du créateur.

ALTER VIEW public.contact_availability               SET (security_invoker = on);
ALTER VIEW public.carpooling_active_conversations    SET (security_invoker = on);
ALTER VIEW public.user_monthly_revenue_stats         SET (security_invoker = on);
ALTER VIEW public.pending_contact_requests           SET (security_invoker = on);
ALTER VIEW public.admin_auto_renew_status            SET (security_invoker = on);
ALTER VIEW public.inspection_photos                  SET (security_invoker = on);
ALTER VIEW public.active_drivers_on_road             SET (security_invoker = on);
ALTER VIEW public.navigation_current_month_dashboard SET (security_invoker = on);
ALTER VIEW public.client_companies                   SET (security_invoker = on);
ALTER VIEW public.user_document_stats                SET (security_invoker = on);
ALTER VIEW public.navigation_hourly_patterns         SET (security_invoker = on);
ALTER VIEW public.navigation_daily_stats             SET (security_invoker = on);
ALTER VIEW public.v_inspection_reports               SET (security_invoker = on);
ALTER VIEW public.tracking_performance_stats         SET (security_invoker = on);
ALTER VIEW public.contact_invitations_sent           SET (security_invoker = on);
ALTER VIEW public.navigation_monthly_stats           SET (security_invoker = on);
ALTER VIEW public.navigation_mission_stats           SET (security_invoker = on);
ALTER VIEW public.navigation_top_missions            SET (security_invoker = on);
ALTER VIEW public.contact_invitations_received       SET (security_invoker = on);
ALTER VIEW public.navigation_alerts                  SET (security_invoker = on);
ALTER VIEW public.missions_with_active_tracking      SET (security_invoker = on);
ALTER VIEW public.quote_statistics                   SET (security_invoker = on);
ALTER VIEW public.active_devices                     SET (security_invoker = on);
ALTER VIEW public.storage_stats                      SET (security_invoker = on);

-- ============================================================================
-- PARTIE 4 : TRACKING PUBLIC — accès via lien sans authentification
-- ============================================================================
-- PROBLÈME : Le lien de tracking envoyé au client fonctionne SANS connexion
-- (utilisateur anonyme = rôle "anon"). Après activation du RLS sur
-- gps_tracking_sessions et gps_location_points, ces tables bloqueraient
-- toutes les requêtes anonymes → le client ne verrait plus la position GPS.
--
-- SOLUTION : Autoriser la lecture publique UNIQUEMENT si un token valide
-- existe dans public_tracking_links (non expiré).
-- ============================================================================

-- Autoriser la lecture d'une session GPS si le lien public est valide
DROP POLICY IF EXISTS "Public tracking: read session via valid token" ON public.gps_tracking_sessions;
CREATE POLICY "Public tracking: read session via valid token"
  ON public.gps_tracking_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.public_tracking_links ptl
      WHERE ptl.mission_id = gps_tracking_sessions.mission_id
        AND (ptl.expires_at IS NULL OR ptl.expires_at > NOW())
    )
  );

-- Autoriser la lecture des points GPS si le lien public est valide
DROP POLICY IF EXISTS "Public tracking: read location points via valid token" ON public.gps_location_points;
CREATE POLICY "Public tracking: read location points via valid token"
  ON public.gps_location_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.gps_tracking_sessions gts
      JOIN public.public_tracking_links ptl ON ptl.mission_id = gts.mission_id
      WHERE gts.id = gps_location_points.session_id
        AND (ptl.expires_at IS NULL OR ptl.expires_at > NOW())
    )
  );

-- S'assurer que la table public_tracking_links est accessible en lecture anonyme
DROP POLICY IF EXISTS "Anyone can read public tracking links" ON public.public_tracking_links;
CREATE POLICY "Anyone can read public tracking links"
  ON public.public_tracking_links FOR SELECT
  USING (
    expires_at IS NULL OR expires_at > NOW()
  );

-- ============================================================================
-- VÉRIFICATION : récapitulatif des tables encore sans RLS
-- ============================================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('spatial_ref_sys') -- table PostGIS système
ORDER BY tablename;

-- ============================================================================
-- RÉSULTAT ATTENDU : 0 lignes (toutes les tables ont RLS activé)
-- ============================================================================
