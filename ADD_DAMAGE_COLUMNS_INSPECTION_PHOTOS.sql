-- Migration: Ajouter les colonnes damage_status et damage_comment à inspection_photos_v2
-- Ces colonnes stockent le statut de dommage (RAS, Rayures, Cassé, Abimé) et le commentaire obligatoire

-- 1. Ajouter les colonnes
ALTER TABLE inspection_photos_v2
ADD COLUMN IF NOT EXISTS damage_status TEXT DEFAULT 'RAS',
ADD COLUMN IF NOT EXISTS damage_comment TEXT;

-- 2. Mettre à jour les photos existantes avec un statut par défaut
UPDATE inspection_photos_v2
SET damage_status = 'RAS'
WHERE damage_status IS NULL;

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'inspection_photos_v2'
  AND column_name IN ('damage_status', 'damage_comment')
ORDER BY column_name;
