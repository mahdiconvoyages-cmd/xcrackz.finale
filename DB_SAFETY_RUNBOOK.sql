-- 🛡️ RUNBOOK DE SÉCURITÉ - OPÉRATIONS DB CRITIQUES
-- ⚠️  À LIRE AVANT TOUTE OPÉRATION DESTRUCTIVE
-- Date: 2025-10-16

-- ===============================================
-- 1. RÈGLES D'OR - JAMAIS DE DELETE SANS BACKUP
-- ===============================================

/*
🚫 INTERDICTIONS ABSOLUES:
- DELETE sur vehicle_inspections sans backup complet
- DELETE sur inspection_photos sans vérifier CASCADE
- DROP TABLE sur tables de production
- TRUNCATE sur données utilisateur

✅ PROCÉDURE OBLIGATOIRE AVANT CLEANUP:
1. Créer backup complet
2. Tester sur copie locale
3. Vérifier les contraintes CASCADE
4. Exécuter avec LIMIT d'abord
5. Confirmer résultat attendu
*/

-- ===============================================
-- 2. BACKUP AVANT OPÉRATION CRITIQUE
-- ===============================================

-- 📋 Créer dump complet des tables critiques
\copy (SELECT * FROM vehicle_inspections) TO 'backup_vehicle_inspections_2025-10-16.csv' DELIMITER ',' CSV HEADER;
\copy (SELECT * FROM inspection_photos) TO 'backup_inspection_photos_2025-10-16.csv' DELIMITER ',' CSV HEADER;
\copy (SELECT * FROM missions WHERE status IN ('in_progress', 'completed')) TO 'backup_missions_2025-10-16.csv' DELIMITER ',' CSV HEADER;

-- 📊 Compter avant opération
SELECT 
  'BEFORE OPERATION' as moment,
  (SELECT COUNT(*) FROM vehicle_inspections) as inspections_count,
  (SELECT COUNT(*) FROM inspection_photos) as photos_count,
  (SELECT COUNT(*) FROM missions WHERE status = 'completed') as completed_missions;

-- ===============================================
-- 3. VÉRIFICATIONS CASCADE BEFORE DELETE
-- ===============================================

-- 🔍 Voir quelles photos seraient supprimées AVANT DELETE
SELECT 
  vi.id as inspection_id,
  vi.mission_id,
  vi.inspection_type,
  vi.created_at,
  COUNT(ip.id) as photos_count
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE vi.id IN (
  -- 🎯 Remplacer par vos critères de suppression
  SELECT id FROM vehicle_inspections 
  WHERE created_at < '2025-01-01' -- EXEMPLE: anciennes inspections
)
GROUP BY vi.id, vi.mission_id, vi.inspection_type, vi.created_at
ORDER BY vi.created_at;

-- ⚠️ ATTENTION: Cette requête montre ce qui serait supprimé par CASCADE
-- Si photos_count > 0, les photos seront supprimées automatiquement !

-- ===============================================
-- 4. CLEANUP SÉCURISÉ AVEC LIMITE
-- ===============================================

-- 🔒 Version sécurisée: DELETE avec LIMIT et transaction
BEGIN;

-- Test sur 1 seul enregistrement d'abord
DELETE FROM vehicle_inspections 
WHERE id IN (
  SELECT id FROM vehicle_inspections 
  WHERE created_at < '2024-01-01' -- Critère sécurisé
  LIMIT 1  -- ⚠️ TOUJOURS LIMIT pour test
);

-- 📊 Vérifier résultat
SELECT 
  'AFTER DELETE LIMIT 1' as moment,
  (SELECT COUNT(*) FROM vehicle_inspections) as inspections_count,
  (SELECT COUNT(*) FROM inspection_photos) as photos_count;

-- 🤔 Si résultat OK, COMMIT. Sinon ROLLBACK !
-- COMMIT; -- Décommentez seulement si satisfait
ROLLBACK; -- Sécurité par défaut

-- ===============================================
-- 5. RECOVERY EN CAS DE PROBLÈME
-- ===============================================

-- 📁 Restaurer depuis backup CSV (adapté à votre structure)
/*
COPY vehicle_inspections FROM 'backup_vehicle_inspections_2025-10-16.csv' DELIMITER ',' CSV HEADER;
COPY inspection_photos FROM 'backup_inspection_photos_2025-10-16.csv' DELIMITER ',' CSV HEADER;

-- Ou via Supabase Dashboard:
-- 1. Aller dans Database > Backups
-- 2. Restore to point in time
-- 3. Choisir timestamp AVANT l'opération destructive
*/

-- ===============================================
-- 6. MONITORING POST-OPÉRATION
-- ===============================================

-- 📊 Vérifier intégrité après opération
SELECT 
  'POST OPERATION CHECK' as status,
  (SELECT COUNT(*) FROM vehicle_inspections) as total_inspections,
  (SELECT COUNT(*) FROM inspection_photos) as total_photos,
  (SELECT COUNT(*) FROM vehicle_inspections WHERE id NOT IN (
    SELECT DISTINCT inspection_id FROM inspection_photos WHERE inspection_id IS NOT NULL
  )) as inspections_without_photos;

-- 🔍 Trouver inspections orphelines (sans photos)
SELECT 
  vi.id,
  vi.mission_id, 
  vi.inspection_type,
  vi.created_at,
  'NO_PHOTOS' as issue
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
WHERE ip.inspection_id IS NULL
  AND vi.status = 'completed'
ORDER BY vi.created_at DESC;

-- 🔍 Trouver photos orphelines (sans inspection)
SELECT 
  ip.id,
  ip.inspection_id,
  ip.photo_type,
  ip.created_at,
  'ORPHANED_PHOTO' as issue
FROM inspection_photos ip
LEFT JOIN vehicle_inspections vi ON vi.id = ip.inspection_id
WHERE vi.id IS NULL
ORDER BY ip.created_at DESC;

-- ===============================================
-- 7. CHECKLIST PRE-OPÉRATION
-- ===============================================

/*
☐ Backup créé et vérifié
☐ Contraintes CASCADE analysées
☐ Test sur LIMIT 1 effectué
☐ Résultat validé par équipe
☐ Rollback plan défini
☐ Monitoring post-op préparé

SIGNATURES:
- Dev: ________________
- Lead: _______________
- Date: ______________

⚠️  NE PAS EXÉCUTER SANS TOUS LES CHECKS
*/