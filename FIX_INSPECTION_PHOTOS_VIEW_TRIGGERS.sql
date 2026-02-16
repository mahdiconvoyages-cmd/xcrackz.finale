-- ============================================
-- FIX VUE INSPECTION_PHOTOS - INSTEAD OF TRIGGERS
-- ============================================
-- Permet d'insérer/modifier via la vue de compatibilité

-- ============================================
-- 1. TRIGGER INSERT
-- ============================================

CREATE OR REPLACE FUNCTION inspection_photos_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inspection_photos_v2 (
    id,
    inspection_id,
    photo_type,
    full_url,
    thumbnail_url,
    file_size_bytes,
    latitude,
    longitude,
    taken_at,
    created_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.inspection_id,
    NEW.photo_type,
    NEW.photo_url, -- photo_url de la vue → full_url dans v2
    NULL, -- thumbnail à générer plus tard
    NULL, -- file_size à calculer
    NEW.latitude,
    NEW.longitude,
    COALESCE(NEW.taken_at, NOW()),
    COALESCE(NEW.created_at, NOW())
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inspection_photos_insert
INSTEAD OF INSERT ON inspection_photos
FOR EACH ROW
EXECUTE FUNCTION inspection_photos_insert_trigger();

-- ============================================
-- 2. TRIGGER UPDATE
-- ============================================

CREATE OR REPLACE FUNCTION inspection_photos_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inspection_photos_v2
  SET
    photo_type = NEW.photo_type,
    full_url = NEW.photo_url,
    latitude = NEW.latitude,
    longitude = NEW.longitude,
    taken_at = NEW.taken_at
  WHERE id = OLD.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inspection_photos_update
INSTEAD OF UPDATE ON inspection_photos
FOR EACH ROW
EXECUTE FUNCTION inspection_photos_update_trigger();

-- ============================================
-- 3. TRIGGER DELETE
-- ============================================

CREATE OR REPLACE FUNCTION inspection_photos_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM inspection_photos_v2
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inspection_photos_delete
INSTEAD OF DELETE ON inspection_photos
FOR EACH ROW
EXECUTE FUNCTION inspection_photos_delete_trigger();

-- ============================================
-- 4. VÉRIFICATION
-- ============================================

SELECT 
  '✅ Triggers créés sur la vue' as status,
  COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE event_object_table = 'inspection_photos'
AND trigger_schema = 'public';

-- Test INSERT (à commenter après test)
/*
INSERT INTO inspection_photos (inspection_id, photo_type, photo_url)
VALUES (
  (SELECT id FROM vehicle_inspections LIMIT 1),
  'test_photo',
  'https://example.com/test.jpg'
);

SELECT * FROM inspection_photos WHERE photo_type = 'test_photo';
SELECT * FROM inspection_photos_v2 WHERE photo_type = 'test_photo';

-- Cleanup
DELETE FROM inspection_photos WHERE photo_type = 'test_photo';
*/
