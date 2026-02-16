-- ================================================================
-- QUICK START - INSPECTION ARRIVÉE AVEC DOCUMENTS ET FRAIS
-- ================================================================
-- Exécutez ce fichier dans l'éditeur SQL de Supabase
-- Puis testez l'inspection d'arrivée mobile
-- ================================================================

-- 1️⃣ EXÉCUTER LE FICHIER PRINCIPAL
-- Copiez-collez le contenu de ADD_INSPECTION_DOCUMENTS_EXPENSES.sql
-- OU exécutez-le directement si vous l'avez sous la main

-- 2️⃣ VÉRIFIER QUE TOUT EST OK
SELECT 
  '✅ Vérification rapide' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'inspection_documents') as table_documents_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'inspection_expenses') as table_expenses_exists,
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'inspection-documents') as bucket_exists,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'inspection_documents') as policies_documents_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'inspection_expenses') as policies_expenses_count;

-- Résultat attendu:
-- table_documents_exists: 1
-- table_expenses_exists: 1
-- bucket_exists: 1
-- policies_documents_count: 3 (SELECT, INSERT, DELETE)
-- policies_expenses_count: 4 (SELECT, INSERT, UPDATE, DELETE)

-- ================================================================
-- 3️⃣ TESTER EN INSÉRANT DES DONNÉES DE TEST
-- ================================================================

-- Trouver une inspection d'arrivée existante (ou créer une mission test)
DO $$
DECLARE
  v_test_mission_id UUID;
  v_test_inspection_id UUID;
  v_test_user_id UUID;
BEGIN
  -- Récupérer le premier utilisateur
  SELECT id INTO v_test_user_id FROM auth.users LIMIT 1;
  
  IF v_test_user_id IS NULL THEN
    RAISE NOTICE '❌ Aucun utilisateur trouvé - créez un compte d''abord';
    RETURN;
  END IF;
  
  RAISE NOTICE '👤 Utilisateur test: %', v_test_user_id;
  
  -- Créer une mission test si nécessaire
  INSERT INTO missions (
    user_id,
    reference,
    pickup_address,
    delivery_address,
    status,
    departure_inspection_completed,
    created_at
  ) VALUES (
    v_test_user_id,
    'TEST-DOCUMENTS-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'Paris, France',
    'Lyon, France',
    'in_progress',
    true,
    NOW()
  )
  RETURNING id INTO v_test_mission_id;
  
  RAISE NOTICE '🚗 Mission test créée: %', v_test_mission_id;
  
  -- Créer inspection de départ
  INSERT INTO vehicle_inspections (
    mission_id,
    inspector_id,
    inspection_type,
    mileage_km,
    fuel_level,
    status,
    completed_at
  ) VALUES (
    v_test_mission_id,
    v_test_user_id,
    'departure',
    45000,
    100,
    'completed',
    NOW()
  );
  
  RAISE NOTICE '📋 Inspection départ créée';
  
  -- Créer inspection d'arrivée
  INSERT INTO vehicle_inspections (
    mission_id,
    inspector_id,
    inspection_type,
    mileage_km,
    fuel_level,
    client_name,
    driver_name,
    status,
    completed_at
  ) VALUES (
    v_test_mission_id,
    v_test_user_id,
    'arrival',
    45250,
    75,
    'Client Test',
    'Convoyeur Test',
    'completed',
    NOW()
  )
  RETURNING id INTO v_test_inspection_id;
  
  RAISE NOTICE '📋 Inspection arrivée créée: %', v_test_inspection_id;
  
  -- Insérer des documents de test
  INSERT INTO inspection_documents (
    inspection_id,
    document_type,
    document_title,
    document_url,
    pages_count,
    file_size_kb
  ) VALUES 
  (
    v_test_inspection_id,
    'delivery_receipt',
    'PV de livraison - Client Test',
    'https://example.com/pv-livraison.pdf',
    1,
    150
  ),
  (
    v_test_inspection_id,
    'damage_report',
    'Constat dommages pare-choc avant',
    'https://example.com/constat-dommages.pdf',
    3,
    450
  );
  
  RAISE NOTICE '📄 2 documents de test insérés';
  
  -- Insérer des frais de test
  INSERT INTO inspection_expenses (
    inspection_id,
    expense_type,
    amount,
    description,
    receipt_url,
    receipt_pages_count
  ) VALUES
  (
    v_test_inspection_id,
    'peage',
    45.50,
    'Autoroute A6 Paris-Lyon',
    'https://example.com/ticket-peage.pdf',
    1
  ),
  (
    v_test_inspection_id,
    'carburant',
    65.00,
    'Plein essence à Lyon',
    'https://example.com/ticket-essence.pdf',
    1
  ),
  (
    v_test_inspection_id,
    'transport',
    28.00,
    'Taxi gare → dépôt',
    NULL,
    0
  );
  
  RAISE NOTICE '💰 3 frais de test insérés';
  RAISE NOTICE '';
  RAISE NOTICE '✅ DONNÉES DE TEST CRÉÉES AVEC SUCCÈS';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Résumé:';
  RAISE NOTICE '  Mission ID: %', v_test_mission_id;
  RAISE NOTICE '  Inspection ID: %', v_test_inspection_id;
  RAISE NOTICE '  Documents: 2';
  RAISE NOTICE '  Frais: 3 (Total: 138.50€)';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Requête pour vérifier:';
  RAISE NOTICE '  SELECT * FROM inspection_documents WHERE inspection_id = ''%'';', v_test_inspection_id;
  RAISE NOTICE '  SELECT * FROM inspection_expenses WHERE inspection_id = ''%'';', v_test_inspection_id;
  
END $$;

-- ================================================================
-- 4️⃣ REQUÊTES DE VÉRIFICATION RAPIDE
-- ================================================================

-- Voir tous les documents scannés
SELECT 
  id.document_title,
  id.document_type,
  id.pages_count,
  id.file_size_kb,
  vi.inspection_type,
  m.reference as mission_ref,
  id.scanned_at
FROM inspection_documents id
JOIN vehicle_inspections vi ON vi.id = id.inspection_id
JOIN missions m ON m.id = vi.mission_id
ORDER BY id.scanned_at DESC
LIMIT 10;

-- Voir tous les frais enregistrés
SELECT 
  ie.expense_type,
  ie.amount,
  ie.description,
  CASE WHEN ie.receipt_url IS NOT NULL THEN '✓ Justificatif' ELSE '✗ Sans justificatif' END as receipt_status,
  vi.inspection_type,
  m.reference as mission_ref,
  ie.created_at
FROM inspection_expenses ie
JOIN vehicle_inspections vi ON vi.id = ie.inspection_id
JOIN missions m ON m.id = vi.mission_id
ORDER BY ie.created_at DESC
LIMIT 10;

-- Total des frais par type
SELECT 
  expense_type,
  COUNT(*) as nb_frais,
  SUM(amount) as total_euros,
  ROUND(AVG(amount), 2) as moyenne_euros,
  COUNT(CASE WHEN receipt_url IS NOT NULL THEN 1 END) as nb_avec_justificatif
FROM inspection_expenses
GROUP BY expense_type
ORDER BY total_euros DESC;

-- Statistiques globales
SELECT 
  'Documents' as type,
  COUNT(*) as total,
  SUM(pages_count) as pages_totales,
  ROUND(AVG(file_size_kb), 2) as taille_moyenne_kb
FROM inspection_documents
UNION ALL
SELECT 
  'Frais - ' || expense_type,
  COUNT(*),
  NULL,
  ROUND(SUM(amount), 2)
FROM inspection_expenses
GROUP BY expense_type
ORDER BY type;

-- ================================================================
-- 5️⃣ NETTOYAGE DES DONNÉES DE TEST (optionnel)
-- ================================================================

-- ⚠️ ATTENTION: Ceci supprimera TOUTES les données de test
-- Décommentez seulement si vous voulez tout nettoyer

/*
DELETE FROM inspection_documents WHERE document_url LIKE '%example.com%';
DELETE FROM inspection_expenses WHERE receipt_url LIKE '%example.com%';
DELETE FROM vehicle_inspections WHERE id IN (
  SELECT vi.id FROM vehicle_inspections vi
  JOIN missions m ON m.id = vi.mission_id
  WHERE m.reference LIKE 'TEST-DOCUMENTS-%'
);
DELETE FROM missions WHERE reference LIKE 'TEST-DOCUMENTS-%';
*/

-- ================================================================
-- ✅ PRÊT POUR LES TESTS MOBILES
-- ================================================================
-- 1. Les tables sont créées ✓
-- 2. Les policies RLS sont actives ✓
-- 3. Le bucket storage est prêt ✓
-- 4. Des données de test existent ✓
--
-- 👉 Maintenant dans l'app mobile:
--    1. Ouvrir une mission en cours
--    2. Cliquer "Inspection Arrivée"
--    3. Étape 1: Capturer 8 photos
--    4. Étape 2: Scanner des documents (PV, constats)
--    5. Étape 3: Ajouter frais avec justificatifs
--    6. Étape 4: Signatures client + convoyeur
--    7. Terminer → Vérifier dans Supabase
-- ================================================================
