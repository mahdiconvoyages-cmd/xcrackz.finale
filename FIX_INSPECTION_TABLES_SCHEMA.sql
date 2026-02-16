-- ================================================================
-- FIX FINAL: Corriger les schémas des tables d'inspection
-- ================================================================
-- Problèmes identifiés:
-- 1. inspection_documents: colonne uploaded_at manquante, document_title peut être NOT NULL
-- 2. inspection_report_shares: UNIQUE(mission_id, report_type) potentiellement manquant
-- 3. inspection_photos_v2: colonne taken_at potentiellement manquante
-- 4. Storage bucket inspection-photos potentiellement manquant
-- ================================================================

-- ================================================
-- 1. FIX inspection_documents
-- ================================================

-- Rendre document_title nullable (le code n'envoie pas toujours ce champ)
ALTER TABLE IF EXISTS inspection_documents 
  ALTER COLUMN document_title DROP NOT NULL;

-- Ajouter uploaded_at si manquant (par sécurité)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspection_documents' 
    AND column_name = 'uploaded_at'
  ) THEN
    ALTER TABLE inspection_documents 
    ADD COLUMN uploaded_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Vérifier les colonnes de inspection_documents
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'inspection_documents'
ORDER BY ordinal_position;

-- ================================================
-- 2. FIX inspection_photos_v2
-- ================================================

-- Ajouter taken_at si manquant
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspection_photos_v2' 
    AND column_name = 'taken_at'
  ) THEN
    ALTER TABLE inspection_photos_v2 
    ADD COLUMN taken_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Vérifier les colonnes de inspection_photos_v2
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inspection_photos_v2'
ORDER BY ordinal_position;

-- ================================================
-- 3. FIX inspection_report_shares unique constraint
-- ================================================

-- Ajouter la contrainte UNIQUE si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_mission_type' 
    AND conrelid = 'inspection_report_shares'::regclass
  ) THEN
    -- Supprimer les doublons d'abord
    DELETE FROM inspection_report_shares a
    USING inspection_report_shares b
    WHERE a.id > b.id 
    AND a.mission_id = b.mission_id 
    AND a.report_type = b.report_type;

    ALTER TABLE inspection_report_shares 
    ADD CONSTRAINT unique_mission_type UNIQUE (mission_id, report_type);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- ================================================
-- 4. Créer le storage bucket si nécessaire
-- ================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('inspection-photos', 'inspection-photos', true, 52428800, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Policy storage pour authenticated users
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'inspection_photos_select' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "inspection_photos_select" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'inspection-photos');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'inspection_photos_insert' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "inspection_photos_insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'inspection-photos');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'inspection_photos_update' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "inspection_photos_update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'inspection-photos');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================================
-- 5. Vérification finale
-- ================================================

-- Résumé des contraintes
SELECT conname, conrelid::regclass AS table_name, contype
FROM pg_constraint
WHERE conrelid IN (
  'inspection_report_shares'::regclass,
  'inspection_documents'::regclass,
  'inspection_photos_v2'::regclass,
  'vehicle_inspections'::regclass
)
ORDER BY conrelid::regclass::text, conname;

-- Résumé des storage buckets
SELECT id, name, public FROM storage.buckets WHERE id LIKE '%inspection%';

-- Résumé des storage policies
SELECT policyname, tablename FROM pg_policies 
WHERE policyname LIKE '%inspection%' AND schemaname = 'storage'
ORDER BY policyname;
