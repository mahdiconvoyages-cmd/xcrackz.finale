-- ================================================================
-- SYSTÈME DE RAPPORTS D'INSPECTION PUBLICS (PARTAGE PAR LIEN)
-- ================================================================
-- Permet de partager un lien unique public vers un rapport d'inspection
-- accessible sans authentification, avec téléchargement ZIP
-- ================================================================

-- 1️⃣ TABLE: public_inspection_reports
-- Stocke les liens publics partagés pour les rapports d'inspection
CREATE TABLE IF NOT EXISTS public_inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Token unique pour l'URL publique (ex: ABC123XYZ)
  share_token text UNIQUE NOT NULL DEFAULT substring(md5(random()::text || clock_timestamp()::text) from 1 for 12),
  
  -- Références
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  departure_inspection_id uuid REFERENCES vehicle_inspections(id) ON DELETE SET NULL,
  arrival_inspection_id uuid REFERENCES vehicle_inspections(id) ON DELETE SET NULL,
  
  -- Créateur
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Expiration (optionnel - NULL = jamais expire)
  expires_at timestamp with time zone,
  
  -- Statistiques
  view_count integer DEFAULT 0,
  last_viewed_at timestamp with time zone,
  
  -- Métadonnées
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_public_reports_share_token ON public_inspection_reports(share_token);
CREATE INDEX IF NOT EXISTS idx_public_reports_mission_id ON public_inspection_reports(mission_id);
CREATE INDEX IF NOT EXISTS idx_public_reports_created_by ON public_inspection_reports(created_by);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_public_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_public_reports_updated_at ON public_inspection_reports;
CREATE TRIGGER trigger_update_public_reports_updated_at
  BEFORE UPDATE ON public_inspection_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_public_reports_updated_at();

-- ================================================================
-- 2️⃣ RLS POLICIES - Accès public en lecture seule
-- ================================================================

ALTER TABLE public_inspection_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut lire (accès public via token)
DROP POLICY IF EXISTS "Public reports readable by anyone" ON public_inspection_reports;
CREATE POLICY "Public reports readable by anyone"
  ON public_inspection_reports
  FOR SELECT
  USING (true);

-- Policy: Seuls les utilisateurs authentifiés peuvent créer
DROP POLICY IF EXISTS "Authenticated users can create public reports" ON public_inspection_reports;
CREATE POLICY "Authenticated users can create public reports"
  ON public_inspection_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Seul le créateur peut modifier/supprimer
DROP POLICY IF EXISTS "Users can update their own public reports" ON public_inspection_reports;
CREATE POLICY "Users can update their own public reports"
  ON public_inspection_reports
  FOR UPDATE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own public reports" ON public_inspection_reports;
CREATE POLICY "Users can delete their own public reports"
  ON public_inspection_reports
  FOR DELETE
  USING (auth.uid() = created_by);

-- ================================================================
-- 3️⃣ FONCTION: create_or_update_public_report
-- Crée ou met à jour un rapport public pour une mission
-- ================================================================

CREATE OR REPLACE FUNCTION create_or_update_public_report(
  p_mission_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_id uuid;
  v_share_token text;
  v_departure_id uuid;
  v_arrival_id uuid;
  v_existing_record public_inspection_reports;
BEGIN
  -- Récupérer les IDs des inspections
  SELECT 
    departure_inspection_id,
    arrival_inspection_id
  INTO v_departure_id, v_arrival_id
  FROM missions
  WHERE id = p_mission_id;

  -- Vérifier si un rapport existe déjà pour cette mission
  SELECT * INTO v_existing_record
  FROM public_inspection_reports
  WHERE mission_id = p_mission_id
  LIMIT 1;

  IF v_existing_record IS NOT NULL THEN
    -- Mettre à jour le rapport existant
    UPDATE public_inspection_reports
    SET 
      departure_inspection_id = v_departure_id,
      arrival_inspection_id = v_arrival_id,
      updated_at = now()
    WHERE id = v_existing_record.id
    RETURNING id, share_token INTO v_report_id, v_share_token;
  ELSE
    -- Créer un nouveau rapport
    INSERT INTO public_inspection_reports (
      mission_id,
      departure_inspection_id,
      arrival_inspection_id,
      created_by
    ) VALUES (
      p_mission_id,
      v_departure_id,
      v_arrival_id,
      p_user_id
    )
    RETURNING id, share_token INTO v_report_id, v_share_token;
  END IF;

  -- Retourner le résultat
  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'share_token', v_share_token,
    'share_url', 'https://xcrackz.com/rapport/' || v_share_token
  );
END;
$$;

-- ================================================================
-- 4️⃣ FONCTION: increment_report_view_count
-- Incrémente le compteur de vues lors de la consultation
-- ================================================================

CREATE OR REPLACE FUNCTION increment_report_view_count(p_share_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public_inspection_reports
  SET 
    view_count = view_count + 1,
    last_viewed_at = now()
  WHERE share_token = p_share_token;
END;
$$;

-- ================================================================
-- 5️⃣ FONCTION: get_public_report_data
-- Récupère toutes les données d'un rapport public par token
-- Inclut: mission, vehicle, inspections, photos, signatures, notes
-- ================================================================

CREATE OR REPLACE FUNCTION get_public_report_data(p_share_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report public_inspection_reports;
  v_result jsonb;
BEGIN
  -- Récupérer le rapport
  SELECT * INTO v_report
  FROM public_inspection_reports
  WHERE share_token = p_share_token;

  IF v_report IS NULL THEN
    RETURN jsonb_build_object('error', 'Report not found');
  END IF;

  -- Vérifier expiration
  IF v_report.expires_at IS NOT NULL AND v_report.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'Report expired');
  END IF;

  -- Incrémenter le compteur
  PERFORM increment_report_view_count(p_share_token);

  -- Construire le résultat complet
  SELECT jsonb_build_object(
    'share_token', v_report.share_token,
    'created_at', v_report.created_at,
    'view_count', v_report.view_count + 1,
    'mission', (
      SELECT jsonb_build_object(
        'id', m.id,
        'reference', m.reference,
        'pickup_location', m.pickup_location,
        'delivery_location', m.delivery_location,
        'status', m.status,
        'vehicle', (
          SELECT jsonb_build_object(
            'id', v.id,
            'brand', v.brand,
            'model', v.model,
            'plate', v.plate,
            'vehicle_type', v.vehicle_type
          )
          FROM vehicles v
          WHERE v.id = m.vehicle_id
        )
      )
      FROM missions m
      WHERE m.id = v_report.mission_id
    ),
    'departure', (
      SELECT jsonb_build_object(
        'id', vi.id,
        'inspection_type', vi.inspection_type,
        'datetime', vi.created_at,
        'location', vi.location,
        'notes', vi.notes,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'status', vi.status,
        'photos', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'photo_url', COALESCE(p.photo_url, p.full_url),
              'thumbnail_url', p.thumbnail_url,
              'photo_type', p.photo_type,
              'created_at', p.created_at
            ) ORDER BY p.created_at
          )
          FROM (
            -- Essayer inspection_photos d'abord
            SELECT id, photo_url, NULL as full_url, NULL as thumbnail_url, photo_type, created_at
            FROM inspection_photos
            WHERE inspection_id = v_report.departure_inspection_id
            UNION ALL
            -- Puis inspection_photos_v2
            SELECT id, NULL as photo_url, full_url, thumbnail_url, photo_type, created_at
            FROM inspection_photos_v2
            WHERE inspection_id = v_report.departure_inspection_id
          ) p
        ), '[]'::jsonb)
      )
      FROM vehicle_inspections vi
      WHERE vi.id = v_report.departure_inspection_id
    ),
    'arrival', (
      SELECT jsonb_build_object(
        'id', vi.id,
        'inspection_type', vi.inspection_type,
        'datetime', vi.created_at,
        'location', vi.location,
        'notes', vi.notes,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'status', vi.status,
        'photos', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'photo_url', COALESCE(p.photo_url, p.full_url),
              'thumbnail_url', p.thumbnail_url,
              'photo_type', p.photo_type,
              'created_at', p.created_at
            ) ORDER BY p.created_at
          )
          FROM (
            -- Essayer inspection_photos d'abord
            SELECT id, photo_url, NULL as full_url, NULL as thumbnail_url, photo_type, created_at
            FROM inspection_photos
            WHERE inspection_id = v_report.arrival_inspection_id
            UNION ALL
            -- Puis inspection_photos_v2
            SELECT id, NULL as photo_url, full_url, thumbnail_url, photo_type, created_at
            FROM inspection_photos_v2
            WHERE inspection_id = v_report.arrival_inspection_id
          ) p
        ), '[]'::jsonb)
      )
      FROM vehicle_inspections vi
      WHERE vi.id = v_report.arrival_inspection_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ================================================================
-- 6️⃣ PERMISSIONS
-- ================================================================

-- Permettre l'exécution des fonctions par tout le monde (anon inclus)
GRANT EXECUTE ON FUNCTION create_or_update_public_report(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_report_data(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_report_view_count(text) TO anon, authenticated;

-- ================================================================
-- 7️⃣ COMMENTAIRES
-- ================================================================

COMMENT ON TABLE public_inspection_reports IS 
'Rapports d''inspection partagés publiquement via un lien unique. Permet aux clients de consulter les rapports sans authentification.';

COMMENT ON COLUMN public_inspection_reports.share_token IS 
'Token unique utilisé dans l''URL publique (ex: https://xcrackz.com/rapport/ABC123XYZ)';

COMMENT ON COLUMN public_inspection_reports.expires_at IS 
'Date d''expiration du lien (NULL = jamais expire)';

COMMENT ON FUNCTION create_or_update_public_report IS 
'Crée ou met à jour un rapport public pour une mission. Génère automatiquement un token unique.';

COMMENT ON FUNCTION get_public_report_data IS 
'Récupère toutes les données d''un rapport public par token, incluant mission, véhicule, inspections, photos et signatures.';

-- ================================================================
-- ✅ VÉRIFICATION
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Table public_inspection_reports créée';
  RAISE NOTICE '✅ RLS policies configurées';
  RAISE NOTICE '✅ Fonctions create_or_update_public_report, get_public_report_data créées';
  RAISE NOTICE '✅ Accès public (anon) autorisé pour la lecture';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Prêt pour le partage de rapports publics !';
END $$;
