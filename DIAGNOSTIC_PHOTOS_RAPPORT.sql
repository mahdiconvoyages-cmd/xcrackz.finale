-- 🔍 DIAGNOSTIC: Pourquoi les photos ne s'affichent pas dans les rapports
-- EXÉCUTER dans Supabase SQL Editor

-- ===============================================
-- ÉTAPE 1: Vérifier les inspections et leur inspector_id
-- ===============================================
SELECT 
  'INSPECTIONS ET INSPECTOR_ID' as info,
  id as inspection_id,
  mission_id,
  inspection_type,
  inspector_id,
  status,
  created_at,
  CASE 
    WHEN inspector_id IS NULL THEN '❌ MANQUANT'
    ELSE '✅ PRÉSENT'
  END as inspector_id_status
FROM vehicle_inspections
ORDER BY created_at DESC;

-- ===============================================
-- ÉTAPE 2: Compter les photos par inspection
-- ===============================================
SELECT 
  'PHOTOS PAR INSPECTION' as info,
  vi.id as inspection_id,
  vi.inspection_type,
  vi.inspector_id,
  COUNT(ip.id) as photo_count,
  CASE 
    WHEN COUNT(ip.id) = 0 THEN '❌ AUCUNE PHOTO'
    ELSE '✅ ' || COUNT(ip.id) || ' photos'
  END as status
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
GROUP BY vi.id, vi.inspection_type, vi.inspector_id
ORDER BY vi.created_at DESC;

-- ===============================================
-- ÉTAPE 3: Vérifier les photos récupérées (996a783c...)
-- ===============================================
SELECT 
  'PHOTOS INSPECTION RECUPEREE' as info,
  ip.inspection_id,
  ip.photo_type,
  ip.photo_url,
  ip.created_at,
  vi.inspector_id,
  vi.status as inspection_status
FROM inspection_photos ip
LEFT JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
WHERE ip.inspection_id = '996a783c-9902-4c66-837a-dc68951d5051'
ORDER BY ip.created_at;

-- ===============================================
-- ÉTAPE 4: Lister tous les utilisateurs (pour trouver votre ID)
-- ===============================================
SELECT 
  'UTILISATEURS EXISTANTS' as info,
  id as user_id,
  email,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- ===============================================
-- SOLUTION: Si inspector_id est NULL, le corriger
-- ===============================================
-- ATTENTION: Remplacez 'VOTRE_USER_ID' par votre vrai ID utilisateur
-- Décommentez et exécutez SEULEMENT après avoir trouvé votre user_id à l'ÉTAPE 4

-- UPDATE vehicle_inspections
-- SET inspector_id = 'VOTRE_USER_ID'
-- WHERE inspector_id IS NULL;