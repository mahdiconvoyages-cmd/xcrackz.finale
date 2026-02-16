-- =====================================================
-- METTRE À JOUR LES URLs EXISTANTES
-- Change toutes les URLs de finalityconvoyage.com vers xcrackz.com
-- =====================================================

-- Option 1: Désactiver tous les anciens partages pour forcer la création de nouveaux
UPDATE public.inspection_report_shares
SET is_active = FALSE
WHERE is_active = TRUE;

-- Un message de confirmation
SELECT 
  'Tous les anciens liens ont été désactivés. Les prochains clics généreront de nouveaux liens avec xcrackz.com' AS status,
  COUNT(*) AS liens_desactives
FROM public.inspection_report_shares
WHERE is_active = FALSE;
