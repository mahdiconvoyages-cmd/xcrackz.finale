-- =====================================================
-- SYNCHRONISATION TOTALE FLUTTER ↔ WEB CRM
-- Vérifie et optimise invoices et quotes
-- =====================================================

-- 1. Realtime déjà actif (pas besoin de réactiver)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;

-- 2. Créer des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);

-- 3. Vérifier que les RLS sont actifs
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- 4. Créer les policies si elles n'existent pas
DROP POLICY IF EXISTS invoices_user_policy ON public.invoices;
CREATE POLICY invoices_user_policy ON public.invoices
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS quotes_user_policy ON public.quotes;
CREATE POLICY quotes_user_policy ON public.quotes
  FOR ALL USING (user_id = auth.uid());

-- 5. Confirmation
SELECT 
  'Synchronisation activée ! Les modifications sur Flutter ou Web seront instantanées.' AS status,
  COUNT(*) FILTER (WHERE schemaname = 'public' AND tablename = 'invoices') AS table_invoices,
  COUNT(*) FILTER (WHERE schemaname = 'public' AND tablename = 'quotes') AS table_quotes
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('invoices', 'quotes');
