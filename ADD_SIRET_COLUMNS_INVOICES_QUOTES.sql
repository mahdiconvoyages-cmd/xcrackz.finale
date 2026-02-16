-- ============================================
-- Migration SQL: Ajout colonnes TVA et métadonnées INSEE
-- ============================================
-- Ajoute les colonnes manquantes pour stocker les informations
-- récupérées via l'API INSEE (numéro TVA, forme juridique, code NAF)
-- 
-- Note: client_siret existe déjà dans invoices, on ajoute les autres champs

-- ============================================
-- INVOICES: Ajouter colonnes TVA et métadonnées
-- ============================================

-- client_siret existe déjà, on ajoute le reste
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS client_vat_number TEXT,
ADD COLUMN IF NOT EXISTS client_legal_form TEXT,
ADD COLUMN IF NOT EXISTS client_activity_code TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Indexes pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_invoices_client_vat_number 
ON public.invoices(client_vat_number);

CREATE INDEX IF NOT EXISTS idx_invoices_client_legal_form 
ON public.invoices(client_legal_form);

-- Commentaires sur les colonnes
COMMENT ON COLUMN public.invoices.client_siret IS 'Numéro SIRET du client (14 chiffres) - déjà existant';
COMMENT ON COLUMN public.invoices.client_vat_number IS 'Numéro de TVA intracommunautaire (FRxx xxxxxxxxx)';
COMMENT ON COLUMN public.invoices.client_legal_form IS 'Forme juridique (SARL, SAS, etc.)';
COMMENT ON COLUMN public.invoices.client_activity_code IS 'Code NAF/APE';
COMMENT ON COLUMN public.invoices.client_phone IS 'Numéro de téléphone du client';

-- ============================================
-- QUOTES: Ajouter colonnes SIRET/TVA/métadonnées
-- ============================================

-- Vérifier si la colonne client_siret existe déjà
DO $$
BEGIN
  -- Ajouter client_siret si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotes' 
    AND column_name = 'client_siret'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN client_siret TEXT;
    RAISE NOTICE 'Colonne client_siret ajoutée à quotes';
  ELSE
    RAISE NOTICE 'Colonne client_siret existe déjà dans quotes';
  END IF;
END $$;

-- Ajouter les autres colonnes
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS client_vat_number TEXT,
ADD COLUMN IF NOT EXISTS client_legal_form TEXT,
ADD COLUMN IF NOT EXISTS client_activity_code TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Indexes pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_quotes_client_siret 
ON public.quotes(client_siret);

CREATE INDEX IF NOT EXISTS idx_quotes_client_vat_number 
ON public.quotes(client_vat_number);

CREATE INDEX IF NOT EXISTS idx_quotes_client_legal_form 
ON public.quotes(client_legal_form);

-- Commentaires sur les colonnes
COMMENT ON COLUMN public.quotes.client_siret IS 'Numéro SIRET du client (14 chiffres)';
COMMENT ON COLUMN public.quotes.client_vat_number IS 'Numéro de TVA intracommunautaire (FRxx xxxxxxxxx)';
COMMENT ON COLUMN public.quotes.client_legal_form IS 'Forme juridique (SARL, SAS, etc.)';
COMMENT ON COLUMN public.quotes.client_activity_code IS 'Code NAF/APE';
COMMENT ON COLUMN public.quotes.client_phone IS 'Numéro de téléphone du client';

-- ============================================
-- MIGRATION DONNÉES EXISTANTES (si nécessaire)
-- ============================================
-- Les nouvelles colonnes sont vides pour l'instant
-- Elles seront remplies automatiquement par l'app Flutter
-- lors de la création/modification de factures/devis avec SIRET

-- ============================================
-- VUES: Recherche facile des entreprises clientes
-- ============================================

-- Supprimer la vue si elle existe déjà (pour éviter les erreurs)
DROP VIEW IF EXISTS public.client_companies;

-- Vue: Toutes les entreprises avec SIRET (basée uniquement sur invoices pour l'instant)
-- La vue sera étendue aux quotes une fois que toutes les colonnes seront confirmées
CREATE OR REPLACE VIEW public.client_companies AS
SELECT 
  client_siret as siret,
  client_vat_number as vat_number,
  client_name as company_name,
  client_legal_form as legal_form,
  client_activity_code as activity_code,
  client_address as address,
  client_email as email,
  client_phone as phone,
  COUNT(id) as total_documents,
  SUM(total) as total_amount,
  MAX(COALESCE(issue_date, created_at::date)) as last_activity_date
FROM public.invoices
WHERE client_siret IS NOT NULL
  AND client_siret != ''
GROUP BY 
  client_siret,
  client_vat_number,
  client_name,
  client_legal_form,
  client_activity_code,
  client_address,
  client_email,
  client_phone
ORDER BY last_activity_date DESC;

-- Permission de lecture pour authenticated users
GRANT SELECT ON public.client_companies TO authenticated;

-- ============================================
-- FONCTIONS UTILES: Recherche et statistiques
-- ============================================

-- Fonction: Rechercher factures/devis par SIRET
CREATE OR REPLACE FUNCTION public.get_documents_by_siret(p_siret TEXT)
RETURNS TABLE (
  type TEXT,
  document_id UUID,
  document_number TEXT,
  document_date DATE,
  total NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  
  -- Factures
  SELECT 
    'invoice'::TEXT as type,
    i.id as document_id,
    i.invoice_number as document_number,
    COALESCE(i.issue_date, i.created_at::DATE) as document_date,
    i.total,
    i.status
  FROM public.invoices i
  WHERE i.client_siret = p_siret
  
  UNION ALL
  
  -- Devis
  SELECT 
    'quote'::TEXT as type,
    q.id as document_id,
    q.quote_number as document_number,
    COALESCE(q.issue_date, q.created_at::DATE) as document_date,
    q.total,
    q.status
  FROM public.quotes q
  WHERE q.client_siret = p_siret
  
  ORDER BY document_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_documents_by_siret TO authenticated;

-- Fonction: Statistiques client par SIRET
CREATE OR REPLACE FUNCTION public.get_client_stats_by_siret(p_siret TEXT)
RETURNS TABLE (
  total_invoices BIGINT,
  total_quotes BIGINT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  pending_amount NUMERIC,
  first_activity DATE,
  last_activity DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT i.id) as total_invoices,
    COUNT(DISTINCT q.id) as total_quotes,
    COALESCE(SUM(i.total), 0) as total_amount,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) as paid_amount,
    COALESCE(SUM(CASE WHEN i.status IN ('draft', 'sent', 'overdue') THEN i.total ELSE 0 END), 0) as pending_amount,
    MIN(COALESCE(i.issue_date, i.created_at::DATE, q.issue_date, q.created_at::DATE))::DATE as first_activity,
    MAX(COALESCE(i.issue_date, i.created_at::DATE, q.issue_date, q.created_at::DATE))::DATE as last_activity
  FROM public.invoices i
  FULL OUTER JOIN public.quotes q ON i.client_siret = q.client_siret
  WHERE COALESCE(i.client_siret, q.client_siret) = p_siret;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_stats_by_siret TO authenticated;

-- ============================================
-- VALIDATION: Vérifier que tout fonctionne
-- ============================================

DO $$
DECLARE
  v_invoices_count INTEGER;
  v_quotes_count INTEGER;
BEGIN
  -- Vérifier colonnes invoices
  SELECT COUNT(*) INTO v_invoices_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name IN ('client_siret', 'client_vat_number', 'client_legal_form', 'client_activity_code');
  
  IF v_invoices_count < 3 THEN
    RAISE EXCEPTION 'Colonnes manquantes dans invoices (trouvé: %, attendu: 3+)', v_invoices_count;
  END IF;
  
  -- Vérifier colonnes quotes
  SELECT COUNT(*) INTO v_quotes_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'quotes'
    AND column_name IN ('client_siret', 'client_vat_number', 'client_legal_form', 'client_activity_code');
  
  IF v_quotes_count < 3 THEN
    RAISE EXCEPTION 'Colonnes manquantes dans quotes (trouvé: %, attendu: 3+)', v_quotes_count;
  END IF;
  
  RAISE NOTICE '✅ Migration SIRET/TVA réussie';
  RAISE NOTICE '   - Invoices: client_siret (existant) + % nouvelles colonnes', v_invoices_count;
  RAISE NOTICE '   - Quotes: % colonnes SIRET/TVA/métadonnées', v_quotes_count;
  RAISE NOTICE '✅ Vue client_companies créée';
  RAISE NOTICE '✅ Fonctions get_documents_by_siret et get_client_stats_by_siret créées';
END;
$$;

-- ============================================
-- EXEMPLES D'UTILISATION
-- ============================================

-- Rechercher tous les documents d'un client par SIRET
-- SELECT * FROM public.get_documents_by_siret('12345678901234');

-- Obtenir les statistiques d'un client
-- SELECT * FROM public.get_client_stats_by_siret('12345678901234');

-- Lister toutes les entreprises clientes
-- SELECT * FROM public.client_companies;

-- Rechercher factures avec SIRET
-- SELECT invoice_number, client_siret, total 
-- FROM public.invoices 
-- WHERE client_siret IS NOT NULL;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
