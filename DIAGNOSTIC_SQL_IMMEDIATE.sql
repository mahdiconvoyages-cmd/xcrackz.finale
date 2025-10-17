-- 🔍 DIAGNOSTIC IMMÉDIAT - État des données après incident
-- À exécuter dans Supabase SQL Editor ou votre client SQL
-- Date: 2025-10-16

-- ===============================================
-- 1. ÉTAT ACTUEL DES DONNÉES
-- ===============================================

-- 📊 Compter les enregistrements actuels
SELECT 
  'ÉTAT ACTUEL' as status,
  (SELECT COUNT(*) FROM vehicle_inspections) as total_inspections,
  (SELECT COUNT(*) FROM inspection_photos) as total_photos,
  (SELECT COUNT(*) FROM missions WHERE status = 'completed') as missions_completees;

-- ===============================================
-- 2. DIAGNOSTIC DES ORPHELINS
-- ===============================================

-- 🔍 Inspections sans photos (problème potentiel)
SELECT 
  'INSPECTIONS SANS PHOTOS' as diagnostic,
  COUNT(*) as count
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE ip.inspection_id IS NULL
  AND vi.status = 'completed';

-- 📋 Détail des inspections sans photos
SELECT 
  vi.id,
  vi.mission_id,
  vi.inspection_type,
  vi.created_at,
  vi.status,
  'MISSING_PHOTOS' as issue
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE ip.inspection_id IS NULL
  AND vi.status = 'completed'
ORDER BY vi.created_at DESC
LIMIT 10;

-- ===============================================
-- 3. VÉRIFICATION CASCADE - EFFET DE SUPPRESSION
-- ===============================================

-- 🔍 Photos orphelines (inspection supprimée)
SELECT 
  'PHOTOS ORPHELINES' as diagnostic,
  COUNT(*) as count
FROM inspection_photos ip
LEFT JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
WHERE vi.id IS NULL;

-- 📋 Détail des photos orphelines
SELECT 
  ip.id,
  ip.inspection_id,
  ip.photo_type,
  ip.created_at,
  'ORPHANED_PHOTO' as issue
FROM inspection_photos ip
LEFT JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
WHERE vi.id IS NULL
ORDER BY ip.created_at DESC
LIMIT 10;

-- ===============================================
-- 4. ANALYSE TEMPORELLE - QUAND L'INCIDENT S'EST PRODUIT
-- ===============================================

-- 📈 Évolution des créations par jour (derniers 7 jours)
SELECT 
  DATE(created_at) as date_creation,
  COUNT(*) as inspections_creees
FROM vehicle_inspections 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date_creation DESC;

-- 📈 Évolution des photos par jour (derniers 7 jours)
SELECT 
  DATE(created_at) as date_creation,
  COUNT(*) as photos_creees
FROM inspection_photos 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date_creation DESC;

-- ===============================================
-- 5. BACKUP D'URGENCE - SAUVEGARDER L'ÉTAT ACTUEL
-- ===============================================

-- 💾 Créer snapshot de l'état actuel
-- (À adapter selon votre client SQL)

-- Pour psql:
-- \copy (SELECT * FROM vehicle_inspections) TO 'backup_emergency_inspections.csv' DELIMITER ',' CSV HEADER;
-- \copy (SELECT * FROM inspection_photos) TO 'backup_emergency_photos.csv' DELIMITER ',' CSV HEADER;

-- Pour autres clients, exporter en CSV via interface graphique

-- ===============================================
-- 6. RÉSUMÉ EXÉCUTIF
-- ===============================================

SELECT 
  'RÉSUMÉ DIAGNOSTIC' as rapport,
  (SELECT COUNT(*) FROM vehicle_inspections) as inspections_totales,
  (SELECT COUNT(*) FROM inspection_photos) as photos_totales,
  (SELECT COUNT(*) FROM vehicle_inspections vi 
   LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id 
   WHERE ip.inspection_id IS NULL AND vi.status = 'completed') as inspections_sans_photos,
  (SELECT COUNT(*) FROM inspection_photos ip 
   LEFT JOIN vehicle_inspections vi ON vi.id = ip.inspection_id 
   WHERE vi.id IS NULL) as photos_orphelines,
  CASE 
    WHEN (SELECT COUNT(*) FROM inspection_photos) = 0 THEN 'PERTE TOTALE - BACKUP OBLIGATOIRE'
    WHEN (SELECT COUNT(*) FROM vehicle_inspections vi 
          LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id 
          WHERE ip.inspection_id IS NULL AND vi.status = 'completed') > 0 
    THEN 'PERTE PARTIELLE - RÉCUPÉRATION POSSIBLE'
    ELSE 'DONNÉES COHÉRENTES'
  END as severite;

-- ===============================================
-- 7. ACTIONS RECOMMANDÉES SELON RÉSULTAT
-- ===============================================

/*
INTERPRÉTATION DES RÉSULTATS:

🟢 DONNÉES COHÉRENTES (photos_totales > 0, inspections_sans_photos = 0)
   → Pas de problème majeur, vérifier juste la cohérence

🟡 PERTE PARTIELLE (photos_totales > 0, inspections_sans_photos > 0)  
   → Certaines photos ont survécu, récupération via Storage possible
   → Exécuter: node check_storage_recovery.js

🔴 PERTE TOTALE (photos_totales = 0)
   → Toutes les photos supprimées par CASCADE
   → BACKUP OBLIGATOIRE via Supabase Dashboard > Point-in-time Recovery
   → Ou restaurer depuis backup manuel si disponible

PROCHAINES ÉTAPES:
1. Noter le résultat "severite" ci-dessus
2. Si PERTE TOTALE → Dashboard Supabase → Backups → Point-in-time Recovery  
3. Si PERTE PARTIELLE → Terminal: node check_storage_recovery.js
4. Si COHÉRENTES → Appliquer juste les correctifs code
*/