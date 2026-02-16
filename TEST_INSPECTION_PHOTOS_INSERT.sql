-- ============================================
-- TEST INSERT VIA VUE INSPECTION_PHOTOS
-- ============================================

-- 1. Test INSERT basique
DO $$
DECLARE
  v_inspection_id UUID;
  v_photo_id UUID;
BEGIN
  -- Récupérer une inspection existante
  SELECT id INTO v_inspection_id 
  FROM vehicle_inspections 
  LIMIT 1;

  RAISE NOTICE 'Test inspection ID: %', v_inspection_id;

  -- Test INSERT via la vue
  INSERT INTO inspection_photos (
    inspection_id, 
    photo_type, 
    photo_url,
    latitude,
    longitude
  )
  VALUES (
    v_inspection_id,
    'test_trigger',
    'https://test.com/test.jpg',
    48.8566,
    2.3522
  )
  RETURNING id INTO v_photo_id;

  RAISE NOTICE '✅ Photo insérée via vue, ID: %', v_photo_id;

  -- Vérifier dans v2
  IF EXISTS (
    SELECT 1 FROM inspection_photos_v2 
    WHERE id = v_photo_id AND photo_type = 'test_trigger'
  ) THEN
    RAISE NOTICE '✅ Photo présente dans inspection_photos_v2';
  ELSE
    RAISE WARNING '❌ Photo NON présente dans inspection_photos_v2';
  END IF;

  -- Vérifier via vue
  IF EXISTS (
    SELECT 1 FROM inspection_photos 
    WHERE id = v_photo_id AND photo_type = 'test_trigger'
  ) THEN
    RAISE NOTICE '✅ Photo visible via vue inspection_photos';
  ELSE
    RAISE WARNING '❌ Photo NON visible via vue';
  END IF;

  -- Cleanup
  DELETE FROM inspection_photos WHERE photo_type = 'test_trigger';
  RAISE NOTICE '✅ Photo de test supprimée';

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erreur: % %', SQLERRM, SQLSTATE;
END $$;

-- ============================================
-- 2. DIAGNOSTIC ERREUR AMBIGUÏTÉ
-- ============================================

-- Vérifier les colonnes de la vue
SELECT 
  '📋 Colonnes de la vue inspection_photos' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'inspection_photos'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Vérifier les colonnes de la table v2
SELECT 
  '📋 Colonnes de inspection_photos_v2' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'inspection_photos_v2'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- 3. TEST QUERY POSSIBLE AVEC AMBIGUÏTÉ
-- ============================================

-- Simuler une query qui pourrait causer l'ambiguïté
-- (comme celle utilisée dans InspectionDepartureNew)
EXPLAIN (VERBOSE, COSTS OFF)
SELECT 
  ip.id,
  ip.inspection_id,
  ip.photo_type,
  vi.id as vehicle_inspection_id,
  vi.inspection_type
FROM inspection_photos ip
INNER JOIN vehicle_inspections vi ON ip.inspection_id = vi.id
LIMIT 1;

-- ============================================
-- 4. VÉRIFIER LES CONTRAINTES
-- ============================================

SELECT 
  '🔗 Contraintes sur inspection_photos_v2' as info,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'inspection_photos_v2'::regclass;

-- ============================================
-- 5. RÉSUMÉ
-- ============================================

SELECT 
  '📊 RÉSUMÉ' as section,
  (SELECT COUNT(*) FROM inspection_photos) as photos_via_vue,
  (SELECT COUNT(*) FROM inspection_photos_v2) as photos_dans_v2,
  (SELECT COUNT(*) FROM inspection_photos_old) as photos_archived;
