-- ============================================
-- MIGRATION DONNÉES EXISTANTES
-- ============================================
-- Migrer inspection_photos → inspection_photos_v2

-- ============================================
-- 1. BACKUP TABLE ACTUELLE
-- ============================================

-- Créer backup avant migration
CREATE TABLE IF NOT EXISTS inspection_photos_backup AS
SELECT * FROM inspection_photos;

SELECT 
  '✅ Backup créé' as status,
  COUNT(*) as photos_backed_up
FROM inspection_photos_backup;

-- ============================================
-- 2. MIGRATION VERS V2
-- ============================================

-- Insérer les photos existantes dans la nouvelle table
INSERT INTO inspection_photos_v2 (
  id,
  inspection_id,
  photo_type,
  full_url, -- Utiliser l'ancienne URL comme full_url
  thumbnail_url, -- NULL pour l'instant, sera généré plus tard
  file_size_bytes,
  latitude,
  longitude,
  taken_at,
  uploaded_at,
  created_at
)
SELECT 
  ip.id,
  ip.inspection_id,
  ip.photo_type,
  ip.photo_url as full_url, -- Photo existante = full size
  NULL as thumbnail_url, -- À générer
  NULL as file_size_bytes, -- À calculer
  ip.latitude,
  ip.longitude,
  COALESCE(ip.taken_at, ip.created_at) as taken_at,
  ip.created_at as uploaded_at,
  ip.created_at
FROM inspection_photos ip
WHERE NOT EXISTS (
  SELECT 1 FROM inspection_photos_v2 ipv2
  WHERE ipv2.id = ip.id
)
ON CONFLICT (id) DO NOTHING;

SELECT 
  '✅ Photos migrées' as status,
  COUNT(*) as photos_migrated
FROM inspection_photos_v2;

-- ============================================
-- 3. MISE À JOUR MÉTADONNÉES
-- ============================================

-- Fonction pour extraire taille fichier depuis Storage
CREATE OR REPLACE FUNCTION update_photo_metadata()
RETURNS void AS $$
DECLARE
  v_photo RECORD;
  v_file_size BIGINT;
BEGIN
  FOR v_photo IN 
    SELECT id, full_url 
    FROM inspection_photos_v2 
    WHERE file_size_bytes IS NULL
    LIMIT 100 -- Traiter par batch pour éviter timeout
  LOOP
    -- Récupérer la taille depuis storage.objects si disponible
    SELECT (metadata->>'size')::bigint INTO v_file_size
    FROM storage.objects
    WHERE name = substring(v_photo.full_url from 'inspection-photos/(.*)$')
    LIMIT 1;
    
    IF v_file_size IS NOT NULL THEN
      UPDATE inspection_photos_v2
      SET file_size_bytes = v_file_size
      WHERE id = v_photo.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Metadata updated for batch';
END;
$$ LANGUAGE plpgsql;

-- Exécuter la mise à jour (à répéter si nécessaire)
SELECT update_photo_metadata();

-- ============================================
-- 4. VÉRIFICATION INTÉGRITÉ
-- ============================================

-- Comparer les counts
SELECT 
  'Photos dans ancienne table' as table_name,
  COUNT(*) as count
FROM inspection_photos
UNION ALL
SELECT 
  'Photos dans nouvelle table' as table_name,
  COUNT(*) as count
FROM inspection_photos_v2
UNION ALL
SELECT 
  'Photos avec thumbnail manquant' as table_name,
  COUNT(*) as count
FROM inspection_photos_v2
WHERE thumbnail_url IS NULL;

-- Vérifier les photos orphelines (sans inspection)
SELECT 
  '⚠️ Photos orphelines' as status,
  COUNT(*) as orphan_count
FROM inspection_photos_v2 ipv2
LEFT JOIN vehicle_inspections vi ON vi.id = ipv2.inspection_id
WHERE vi.id IS NULL;

-- Vérifier les inspections sans photos
SELECT 
  '⚠️ Inspections sans photos' as status,
  COUNT(*) as inspections_without_photos
FROM vehicle_inspections vi
LEFT JOIN inspection_photos_v2 ipv2 ON ipv2.inspection_id = vi.id
WHERE ipv2.id IS NULL
AND vi.created_at > NOW() - INTERVAL '30 days'; -- Seulement les récentes

-- ============================================
-- 5. CRÉER VUE COMPATIBLE POUR TRANSITION
-- ============================================

-- Renommer l'ancienne table pour faire place à la vue
ALTER TABLE inspection_photos RENAME TO inspection_photos_old;

-- Vue qui émule l'ancienne structure pour compatibilité
CREATE OR REPLACE VIEW inspection_photos AS
SELECT 
  id,
  inspection_id,
  photo_type,
  full_url as photo_url, -- Mapper full_url vers photo_url
  latitude,
  longitude,
  taken_at,
  created_at
FROM inspection_photos_v2;

COMMENT ON VIEW inspection_photos 
IS 'Vue de compatibilité pendant migration. Pointe vers inspection_photos_v2';

-- ============================================
-- 6. PLAN DE ROLLBACK
-- ============================================

-- En cas de problème, restaurer depuis backup:
/*
-- Supprimer la vue
DROP VIEW IF EXISTS inspection_photos;

-- Restaurer la table originale
ALTER TABLE inspection_photos_old RENAME TO inspection_photos;

-- Vider et restaurer v2
TRUNCATE inspection_photos_v2;
INSERT INTO inspection_photos_v2 SELECT * FROM inspection_photos_backup;
*/

-- ============================================
-- 7. NETTOYAGE POST-MIGRATION (OPTIONNEL)
-- ============================================

-- Une fois la migration validée et stable (après plusieurs jours de tests):
/*
-- Supprimer le backup
DROP TABLE IF EXISTS inspection_photos_backup;

-- Supprimer l'ancienne table archivée
DROP TABLE IF EXISTS inspection_photos_old;

-- À ce stade:
-- - inspection_photos est une VUE pointant vers inspection_photos_v2
-- - Le code existant continue de fonctionner
-- - inspection_photos_v2 est la vraie table
*/

-- ============================================
-- 8. RÉSUMÉ MIGRATION
-- ============================================

SELECT 
  '📊 RÉSUMÉ MIGRATION' as status,
  jsonb_build_object(
    'photos_old_archived', (SELECT COUNT(*) FROM inspection_photos_old),
    'photos_v2', (SELECT COUNT(*) FROM inspection_photos_v2),
    'photos_via_view', (SELECT COUNT(*) FROM inspection_photos),
    'backup_created', (SELECT COUNT(*) FROM inspection_photos_backup),
    'photos_with_metadata', (SELECT COUNT(*) FROM inspection_photos_v2 WHERE file_size_bytes IS NOT NULL),
    'photos_need_thumbnails', (SELECT COUNT(*) FROM inspection_photos_v2 WHERE thumbnail_url IS NULL)
  ) as details;
