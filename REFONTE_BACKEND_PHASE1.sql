-- ============================================
-- REFONTE RAPPORTS INSPECTION - PHASE 1: BACKEND
-- ============================================
-- Date: 30 Octobre 2025
-- Objectif: Optimiser stockage photos et génération PDF

-- ============================================
-- 1. NOUVELLE TABLE PHOTOS OPTIMISÉE
-- ============================================

-- Table photos V2 avec thumbnails et métadonnées
CREATE TABLE IF NOT EXISTS inspection_photos_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  
  -- Type de photo (front, back, interior, etc.)
  photo_type TEXT NOT NULL,
  
  -- URLs séparées pour optimisation
  thumbnail_url TEXT, -- 400px, WebP, rapide à charger
  full_url TEXT NOT NULL, -- 1920px, WebP, haute qualité
  
  -- Métadonnées
  file_size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  mime_type TEXT DEFAULT 'image/webp',
  
  -- Géolocalisation si disponible
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Timestamps
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte: une seule photo par type par inspection
  CONSTRAINT unique_photo_per_type_v2 UNIQUE(inspection_id, photo_type)
);

-- Index pour performance de chargement
CREATE INDEX idx_photos_v2_inspection ON inspection_photos_v2(inspection_id);
CREATE INDEX idx_photos_v2_type ON inspection_photos_v2(photo_type);
CREATE INDEX idx_photos_v2_uploaded ON inspection_photos_v2(uploaded_at DESC);

-- Commentaires pour documentation
COMMENT ON TABLE inspection_photos_v2 IS 'Version 2: Photos optimisées avec thumbnails et métadonnées complètes';
COMMENT ON COLUMN inspection_photos_v2.thumbnail_url IS 'URL thumbnail 400px WebP pour affichage rapide';
COMMENT ON COLUMN inspection_photos_v2.full_url IS 'URL photo complète 1920px WebP pour zoom';

-- ============================================
-- 2. TABLE CACHE PDF
-- ============================================

CREATE TABLE IF NOT EXISTS inspection_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  
  -- URL du PDF généré
  pdf_url TEXT NOT NULL,
  
  -- Métadonnées
  file_size_bytes BIGINT,
  page_count INTEGER DEFAULT 1,
  
  -- Versioning pour regénération si nécessaire
  version INTEGER DEFAULT 1,
  
  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  last_downloaded_at TIMESTAMPTZ,
  
  -- Un seul PDF par inspection (le plus récent)
  CONSTRAINT unique_pdf_per_inspection UNIQUE(inspection_id, version)
);

-- Index
CREATE INDEX idx_pdfs_inspection ON inspection_pdfs(inspection_id);
CREATE INDEX idx_pdfs_generated ON inspection_pdfs(generated_at DESC);

COMMENT ON TABLE inspection_pdfs IS 'Cache des PDFs générés server-side pour éviter regénération';

-- ============================================
-- 3. AMÉLIORATION TABLE INSPECTIONS
-- ============================================

-- Ajouter index manquants sur table existante
CREATE INDEX IF NOT EXISTS idx_inspections_mission ON vehicle_inspections(mission_id);
CREATE INDEX IF NOT EXISTS idx_inspections_type ON vehicle_inspections(inspection_type);
CREATE INDEX IF NOT EXISTS idx_inspections_created ON vehicle_inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_status_complete ON vehicle_inspections(mission_id, inspection_type) 
  WHERE client_signature IS NOT NULL AND driver_signature IS NOT NULL;

-- Ajouter colonnes pour tracking PDF
ALTER TABLE vehicle_inspections 
ADD COLUMN IF NOT EXISTS pdf_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN vehicle_inspections.pdf_generated IS 'Indique si le PDF a été généré server-side';
COMMENT ON COLUMN vehicle_inspections.last_synced_at IS 'Dernière sync mobile → web pour realtime';

-- ============================================
-- 4. VUE UNIFIÉE POUR RAPPORTS
-- ============================================

-- Vue qui joint inspections + photos + PDFs pour faciliter les requêtes
CREATE OR REPLACE VIEW v_inspection_reports AS
SELECT 
  vi.id as inspection_id,
  vi.mission_id,
  vi.inspection_type,
  vi.overall_condition,
  vi.mileage_km,
  vi.fuel_level,
  vi.client_name,
  vi.driver_name,
  vi.created_at as inspection_date,
  vi.pdf_generated,
  
  -- Mission info
  m.reference as mission_reference,
  m.vehicle_brand,
  m.vehicle_model,
  m.vehicle_plate,
  m.pickup_address,
  m.delivery_address,
  
  -- Compte des photos
  COUNT(DISTINCT ip.id) as photo_count,
  
  -- URL du PDF si généré
  ipdf.pdf_url,
  ipdf.generated_at as pdf_generated_at,
  
  -- Agrégation des URLs photos pour faciliter le chargement
  json_agg(
    DISTINCT jsonb_build_object(
      'id', ip.id,
      'type', ip.photo_type,
      'thumbnail', ip.thumbnail_url,
      'full', ip.full_url,
      'taken_at', ip.taken_at
    ) ORDER BY ip.taken_at
  ) FILTER (WHERE ip.id IS NOT NULL) as photos

FROM vehicle_inspections vi
LEFT JOIN missions m ON m.id = vi.mission_id
LEFT JOIN inspection_photos_v2 ip ON ip.inspection_id = vi.id
LEFT JOIN LATERAL (
  SELECT pdf_url, generated_at
  FROM inspection_pdfs
  WHERE inspection_id = vi.id
  ORDER BY version DESC
  LIMIT 1
) ipdf ON true

GROUP BY 
  vi.id, vi.mission_id, vi.inspection_type, vi.overall_condition,
  vi.mileage_km, vi.fuel_level, vi.client_name, vi.driver_name,
  vi.created_at, vi.pdf_generated,
  m.reference, m.vehicle_brand, m.vehicle_model, m.vehicle_plate,
  m.pickup_address, m.delivery_address,
  ipdf.pdf_url, ipdf.generated_at;

COMMENT ON VIEW v_inspection_reports IS 'Vue optimisée avec toutes les données nécessaires pour affichage rapports';

-- ============================================
-- 5. FONCTION HELPER POUR VÉRIFIER COMPLÉTUDE
-- ============================================

CREATE OR REPLACE FUNCTION is_inspection_complete(inspection_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_inspection RECORD;
  v_photo_count INTEGER;
  v_required_photos INTEGER := 6; -- front, back, left, right, interior, dashboard
BEGIN
  -- Récupérer l'inspection
  SELECT * INTO v_inspection
  FROM vehicle_inspections
  WHERE id = inspection_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier signatures
  IF v_inspection.client_signature IS NULL OR 
     v_inspection.driver_signature IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier photos (au moins 4 requises)
  SELECT COUNT(*) INTO v_photo_count
  FROM inspection_photos_v2
  WHERE inspection_id = inspection_id;
  
  RETURN v_photo_count >= 4;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_inspection_complete IS 'Vérifie si inspection est complète (signatures + photos minimum)';

-- ============================================
-- 6. RÉSUMÉ ET VÉRIFICATION
-- ============================================

-- Afficher résumé de la migration
SELECT 
  '✅ Tables créées' as status,
  COUNT(*) FILTER (WHERE table_name = 'inspection_photos_v2') as photos_v2,
  COUNT(*) FILTER (WHERE table_name = 'inspection_pdfs') as pdfs_table
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('inspection_photos_v2', 'inspection_pdfs');

-- Vérifier les index
SELECT 
  '✅ Index créés' as status,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND (indexname LIKE 'idx_photos_v2_%' OR indexname LIKE 'idx_pdfs_%');

-- Vérifier la vue
SELECT 
  '✅ Vue créée' as status,
  COUNT(*) as view_exists
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'v_inspection_reports';
