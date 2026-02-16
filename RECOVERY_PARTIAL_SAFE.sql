-- 🔄 RÉCUPÉRATION PARTIELLE SÉCURISÉE
-- Récupère UNIQUEMENT les photos de l'inspection existante
-- EXÉCUTER dans Supabase SQL Editor

-- ===============================================
-- RÉCUPÉRATION: 1 inspection (6 photos)
-- ===============================================

INSERT INTO inspection_photos (
  inspection_id,
  photo_type,
  photo_url,
  created_at
) VALUES 

-- ========================================
-- INSPECTION EXISTANTE: 996a783c-9902-4c66-837a-dc68951d5051 (6 photos)
-- ========================================
('996a783c-9902-4c66-837a-dc68951d5051', 'front', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-front-1760568278199.png', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'back', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-back-1760568279638.png', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'left_side', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-left_side-1760568280485.png', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'right_side', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-right_side-1760568281599.png', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'interior', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-interior-1760568282264.png', NOW()),
('996a783c-9902-4c66-837a-dc68951d5051', 'dashboard', 'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/inspections/996a783c-9902-4c66-837a-dc68951d5051-dashboard-1760568283095.png', NOW());

-- ===============================================
-- VÉRIFICATION
-- ===============================================
SELECT 
  '✅ RÉCUPÉRATION PARTIELLE TERMINÉE' as status,
  COUNT(*) as photos_recuperees
FROM inspection_photos
WHERE inspection_id = '996a783c-9902-4c66-837a-dc68951d5051';

-- ✅ RÉSULTAT ATTENDU: photos_recuperees = 6
