-- 🔄 RÉCUPÉRATION COMPLÈTE AVEC RECRÉATION DES INSPECTIONS
-- ⚠️ ATTENTION: Recrée les inspections supprimées
-- EXÉCUTER dans Supabase SQL Editor SEULEMENT si vous voulez TOUT récupérer

-- ===============================================
-- ÉTAPE 1: Recréer les 3 inspections manquantes
-- ===============================================

-- AVANT D'EXÉCUTER: Vérifiez que vous avez les données nécessaires:
-- - vehicle_id pour chaque inspection
-- - driver_name
-- - mission_reference
-- - etc.

-- ⚠️ CETTE PARTIE NÉCESSITE DES DONNÉES QUE NOUS N'AVONS PAS
-- Vous devez remplir manuellement les champs ci-dessous:

INSERT INTO vehicle_inspections (
  id,
  vehicle_id,
  driver_name,
  status,
  inspection_type,
  created_at
) VALUES
-- Inspection 1 (VOUS DEVEZ REMPLIR LES DONNÉES)
('ad077d9d-6931-4dc1-b248-28ec03bdbb85', 
 'VEHICLE_ID_INCONNU', -- ⚠️ À REMPLIR
 'Conducteur inconnu',  -- ⚠️ À REMPLIR
 'completed', 
 'arrival',
 '2025-01-13 10:00:00'), -- Date approximative depuis le Storage

-- Inspection 2 (VOUS DEVEZ REMPLIR LES DONNÉES)
('b49282af-b823-4b6f-82d0-34c6a771a058',
 'VEHICLE_ID_INCONNU', -- ⚠️ À REMPLIR
 'Conducteur inconnu',  -- ⚠️ À REMPLIR
 'completed',
 'arrival',
 '2025-01-13 14:00:00'),

-- Inspection 3 (VOUS DEVEZ REMPLIR LES DONNÉES)
('b6fa89b8-97b2-4486-bcd1-dea33e7cf77c',
 'VEHICLE_ID_INCONNU', -- ⚠️ À REMPLIR
 'Conducteur inconnu',  -- ⚠️ À REMPLIR
 'completed',
 'arrival',
 '2025-01-13 14:30:00');

-- ===============================================
-- ÉTAPE 2: Associer toutes les photos (24 photos)
-- ===============================================

INSERT INTO inspection_photos (
  inspection_id,
  photo_type,
  photo_url,
  created_at
) VALUES 

-- Inspection existante: 996a783c-9902-4c66-837a-dc68951d5051 (6 photos)
('996a783c-9902-4c66-837a-dc68951d5051', 'front', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-front-1760568278199.png', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'back', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-back-1760568279638.png', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'left_side', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-left_side-1760568280485.png', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'right_side', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-right_side-1760568281599.png', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'interior', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-interior-1760568282264.png', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'dashboard', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-dashboard-1760568283095.png', NOW()),

-- Inspection recréée 1: ad077d9d-6931-4dc1-b248-28ec03bdbb85 (6 photos)
('ad077d9d-6931-4dc1-b248-28ec03bdbb85', 'front', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/ad077d9d-6931-4dc1-b248-28ec03bdbb85-front-1760385482056.png', NOW()),
('ad077d9d-6931-4dc1-b248-28ec03bdbb85', 'back', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/ad077d9d-6931-4dc1-b248-28ec03bdbb85-back-1760385483259.png', NOW()),
('ad077d9d-6931-4dc1-b248-28ec03bdbb85', 'left_side', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/ad077d9d-6931-4dc1-b248-28ec03bdbb85-left_side-1760385483754.png', NOW()),
('ad077d9d-6931-4dc1-b248-28ec03bdbb85', 'right_side', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/ad077d9d-6931-4dc1-b248-28ec03bdbb85-right_side-1760385484409.png', NOW()),
('ad077d9d-6931-4dc1-b248-28ec03bdbb85', 'interior', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/ad077d9d-6931-4dc1-b248-28ec03bdbb85-interior-1760385484910.png', NOW()),
('ad077d9d-6931-4dc1-b248-28ec03bdbb85', 'dashboard', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/ad077d9d-6931-4dc1-b248-28ec03bdbb85-dashboard-1760385485406.png', NOW()),

-- Inspection recréée 2: b49282af-b823-4b6f-82d0-34c6a771a058 (6 photos)
('b49282af-b823-4b6f-82d0-34c6a771a058', 'front', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b49282af-b823-4b6f-82d0-34c6a771a058-front-1760510101146.jpg', NOW()),
('b49282af-b823-4b6f-82d0-34c6a771a058', 'back', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b49282af-b823-4b6f-82d0-34c6a771a058-back-1760510104593.jpg', NOW()),
('b49282af-b823-4b6f-82d0-34c6a771a058', 'left_side', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b49282af-b823-4b6f-82d0-34c6a771a058-left_side-1760510107110.jpg', NOW()),
('b49282af-b823-4b6f-82d0-34c6a771a058', 'right_side', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b49282af-b823-4b6f-82d0-34c6a771a058-right_side-1760510109159.jpg', NOW()),
('b49282af-b823-4b6f-82d0-34c6a771a058', 'interior', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b49282af-b823-4b6f-82d0-34c6a771a058-interior-1760510111177.jpg', NOW()),
('b49282af-b823-4b6f-82d0-34c6a771a058', 'dashboard', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b49282af-b823-4b6f-82d0-34c6a771a058-dashboard-1760510113057.jpg', NOW()),

-- Inspection recréée 3: b6fa89b8-97b2-4486-bcd1-dea33e7cf77c (6 photos)
('b6fa89b8-97b2-4486-bcd1-dea33e7cf77c', 'front', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b6fa89b8-97b2-4486-bcd1-dea33e7cf77c-front-1760510199424.png', NOW()),
('b6fa89b8-97b2-4486-bcd1-dea33e7cf77c', 'back', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b6fa89b8-97b2-4486-bcd1-dea33e7cf77c-back-1760510200425.png', NOW()),
('b6fa89b8-97b2-4486-bcd1-dea33e7cf77c', 'left_side', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b6fa89b8-97b2-4486-bcd1-dea33e7cf77c-left_side-1760510201142.jpg', NOW()),
('b6fa89b8-97b2-4486-bcd1-dea33e7cf77c', 'right_side', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b6fa89b8-97b2-4486-bcd1-dea33e7cf77c-right_side-1760510202142.png', NOW()),
('b6fa89b8-97b2-4486-bcd1-dea33e7cf77c', 'interior', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b6fa89b8-97b2-4486-bcd1-dea33e7cf77c-interior-1760510202984.png', NOW()),
('b6fa89b8-97b2-4486-bcd1-dea33e7cf77c', 'dashboard', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/b6fa89b8-97b2-4486-bcd1-dea33e7cf77c-dashboard-1760510203639.png', NOW());

-- ===============================================
-- VÉRIFICATION
-- ===============================================
SELECT 
  '✅ RÉCUPÉRATION COMPLÈTE TERMINÉE' as status,
  (SELECT COUNT(*) FROM vehicle_inspections) as total_inspections,
  (SELECT COUNT(*) FROM inspection_photos) as total_photos;

-- ✅ RÉSULTAT ATTENDU: total_inspections = 9, total_photos = 30
