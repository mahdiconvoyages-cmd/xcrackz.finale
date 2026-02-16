-- ============================================
-- DIAGNOSTIC: POURQUOI INSERT ÉCHOUE
-- ============================================

-- 1. Tester INSERT manuellement (comme le ferait l'app mobile)
DO $$
DECLARE
  v_test_inspection_id UUID;
  v_test_photo_id UUID;
BEGIN
  -- Prendre une vraie inspection
  SELECT id INTO v_test_inspection_id 
  FROM vehicle_inspections 
  WHERE created_at::date = CURRENT_DATE 
  LIMIT 1;

  RAISE NOTICE 'Test avec inspection: %', v_test_inspection_id;

  -- Simuler l'INSERT mobile via la vue
  BEGIN
    INSERT INTO inspection_photos (
      inspection_id,
      photo_type,
      photo_url,
      latitude,
      longitude
    ) VALUES (
      v_test_inspection_id,
      'test_mobile_insert',
      'https://test.com/test.jpg',
      48.8566,
      2.3522
    ) RETURNING id INTO v_test_photo_id;
    
    RAISE NOTICE '✅ INSERT réussi, photo ID: %', v_test_photo_id;
    
    -- Vérifier présence dans v2
    IF EXISTS (SELECT 1 FROM inspection_photos_v2 WHERE id = v_test_photo_id) THEN
      RAISE NOTICE '✅ Photo présente dans v2';
    ELSE
      RAISE WARNING '❌ Photo absente de v2';
    END IF;
    
    -- Cleanup
    DELETE FROM inspection_photos WHERE id = v_test_photo_id;
    RAISE NOTICE '✅ Test photo supprimée';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ INSERT ÉCHOUÉ: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;
END $$;

-- ============================================
-- 2. VÉRIFIER LES POLICIES RLS SUR inspection_photos_v2
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'inspection_photos_v2'
ORDER BY policyname;

-- ============================================
-- 3. VÉRIFIER RLS ACTIVÉ
-- ============================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('inspection_photos_v2', 'inspection_photos_old')
AND schemaname = 'public';

-- ============================================
-- 4. VÉRIFIER LES TRIGGERS SUR v2
-- ============================================

SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'inspection_photos_v2'
ORDER BY trigger_name;
