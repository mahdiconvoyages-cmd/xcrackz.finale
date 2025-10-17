-- 🧹 NETTOYAGE DES DOUBLONS D'INSPECTIONS
-- EXÉCUTER dans Supabase SQL Editor
-- Date: 2025-10-16

-- ===============================================
-- ÉTAPE 1 : IDENTIFIER LES DOUBLONS
-- ===============================================
-- Exécutez cette requête AVANT de supprimer pour vérifier
SELECT 
  mission_id,
  inspection_type,
  COUNT(*) as nombre_inspections,
  STRING_AGG(id::text, ', ') as inspection_ids,
  STRING_AGG(
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM inspection_photos 
        WHERE inspection_id = vehicle_inspections.id
      ) THEN '✅ Avec photos'
      ELSE '❌ Sans photos'
    END, 
    ' | '
  ) as statut_photos
FROM vehicle_inspections
GROUP BY mission_id, inspection_type
HAVING COUNT(*) > 1
ORDER BY mission_id, inspection_type;

-- ===============================================
-- ÉTAPE 2 : SUPPRIMER LES DOUBLONS (GARDER LE PLUS ANCIEN AVEC PHOTOS)
-- ===============================================

-- 🎯 Stratégie: Pour chaque mission/type, garder:
--   1. L'inspection qui a des photos (priorité)
--   2. Si aucune n'a de photos, garder la plus ancienne

-- ⚠️ ATTENTION: Cette suppression est DÉFINITIVE !
-- Exécutez ÉTAPE 1 d'abord pour voir ce qui sera supprimé

WITH doublons AS (
  SELECT 
    vi.id,
    vi.mission_id,
    vi.inspection_type,
    vi.created_at,
    COUNT(ip.id) as photo_count,
    ROW_NUMBER() OVER (
      PARTITION BY vi.mission_id, vi.inspection_type 
      ORDER BY 
        -- Prioriser celles avec photos
        COUNT(ip.id) DESC,
        -- Puis la plus ancienne
        vi.created_at ASC
    ) as rang
  FROM vehicle_inspections vi
  LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
  GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.created_at
)
DELETE FROM vehicle_inspections
WHERE id IN (
  SELECT id FROM doublons WHERE rang > 1
);

-- ===============================================
-- ÉTAPE 3 : VÉRIFICATION POST-NETTOYAGE
-- ===============================================
-- Exécutez cette requête APRÈS le nettoyage pour vérifier
SELECT 
  'Vérification post-nettoyage' as info,
  COUNT(*) as total_inspections,
  COUNT(DISTINCT mission_id) as total_missions,
  COUNT(CASE WHEN inspection_type = 'departure' THEN 1 END) as inspections_depart,
  COUNT(CASE WHEN inspection_type = 'arrival' THEN 1 END) as inspections_arrivee,
  SUM(CASE WHEN doublons > 0 THEN 1 ELSE 0 END) as doublons_restants
FROM (
  SELECT 
    mission_id,
    inspection_type,
    COUNT(*) - 1 as doublons
  FROM vehicle_inspections
  GROUP BY mission_id, inspection_type
) sub;

-- ===============================================
-- ÉTAPE 4 : DÉTAILS PAR MISSION
-- ===============================================
SELECT 
  m.reference as mission_ref,
  COUNT(DISTINCT CASE WHEN vi.inspection_type = 'departure' THEN vi.id END) as depart_count,
  COUNT(DISTINCT CASE WHEN vi.inspection_type = 'arrival' THEN vi.id END) as arrival_count,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN vi.inspection_type = 'departure' THEN vi.id END) > 1 
      OR COUNT(DISTINCT CASE WHEN vi.inspection_type = 'arrival' THEN vi.id END) > 1 
    THEN '⚠️ DOUBLONS DÉTECTÉS'
    WHEN COUNT(DISTINCT CASE WHEN vi.inspection_type = 'departure' THEN vi.id END) = 1 
      AND COUNT(DISTINCT CASE WHEN vi.inspection_type = 'arrival' THEN vi.id END) = 1 
    THEN '✅ OK (1 départ + 1 arrivée)'
    WHEN COUNT(DISTINCT CASE WHEN vi.inspection_type = 'departure' THEN vi.id END) = 1 
      AND COUNT(DISTINCT CASE WHEN vi.inspection_type = 'arrival' THEN vi.id END) = 0 
    THEN '⏳ En cours (départ seulement)'
    ELSE '❓ État inconnu'
  END as statut
FROM missions m
LEFT JOIN vehicle_inspections vi ON vi.mission_id = m.id
GROUP BY m.id, m.reference
ORDER BY m.created_at DESC;

-- ===============================================
-- RÉSUMÉ
-- ===============================================
-- Après exécution du script:
-- ✅ Chaque mission aura maximum 1 inspection de départ
-- ✅ Chaque mission aura maximum 1 inspection d'arrivée
-- ✅ Les inspections avec photos sont conservées en priorité
-- ✅ Les inspections les plus anciennes sont conservées en second choix
