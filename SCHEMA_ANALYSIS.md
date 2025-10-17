-- 📊 ANALYSE DU SCHÉMA - INCOHÉRENCES POTENTIELLES DÉTECTÉES

-- ===============================================
-- ⚠️ PROBLÈME 1: Doublons de tables (inspections vs vehicle_inspections)
-- ===============================================
-- Vous avez DEUX tables d'inspections :
-- 1. "inspections" (ligne CREATE TABLE public.inspections)
-- 2. "vehicle_inspections" (ligne CREATE TABLE public.vehicle_inspections)
-- 
-- Les photos sont liées à "vehicle_inspections" :
-- FOREIGN KEY (inspection_id) REFERENCES public.vehicle_inspections(id)
--
-- MAIS la table "inspections" existe aussi avec un schéma différent !

-- ===============================================
-- ⚠️ PROBLÈME 2: inspection_photos pointe vers vehicle_inspections
-- ===============================================
-- CREATE TABLE public.inspection_photos (
--   inspection_id uuid NOT NULL,
--   CONSTRAINT inspection_photos_inspection_id_fkey 
--   FOREIGN KEY (inspection_id) REFERENCES public.vehicle_inspections(id)
-- )
--
-- ✅ C'EST CORRECT - Les photos pointent vers vehicle_inspections

-- ===============================================
-- ⚠️ PROBLÈME 3: Pas de colonne "uploaded_by" dans inspection_photos
-- ===============================================
-- CREATE TABLE public.inspection_photos (
--   id uuid,
--   inspection_id uuid NOT NULL,
--   photo_url text NOT NULL,
--   photo_type text NOT NULL,
--   description text,
--   annotations jsonb,
--   latitude numeric,
--   longitude numeric,
--   taken_at timestamp,
--   created_at timestamp
-- )
--
-- ❌ AUCUNE COLONNE "uploaded_by" 
-- ✅ CORRECTIONS DÉJÀ APPLIQUÉES dans le code TypeScript

-- ===============================================
-- ⚠️ PROBLÈME 4: Deux systèmes GPS différents
-- ===============================================
-- 1. gps_tracking_sessions / gps_location_points
-- 2. mission_tracking / mission_tracking_positions
-- 3. mission_tracking_sessions
--
-- ⚠️ CONFUSION POSSIBLE - 3 systèmes de tracking en parallèle

-- ===============================================
-- ⚠️ PROBLÈME 5: documents.inspection_id pointe vers "inspections"
-- ===============================================
-- CREATE TABLE public.documents (
--   inspection_id uuid,
--   CONSTRAINT documents_inspection_id_fkey 
--   FOREIGN KEY (inspection_id) REFERENCES public.inspections(id)
-- )
--
-- ⚠️ INCOHÉRENCE avec inspection_photos qui pointe vers vehicle_inspections

-- ===============================================
-- ✅ RÉSUMÉ DES ACTIONS REQUISES
-- ===============================================

-- 1. Clarifier quelle table utiliser : inspections OU vehicle_inspections
-- 2. Vérifier si "inspections" est obsolète
-- 3. Unifier les systèmes de tracking GPS
-- 4. Nettoyer les doublons d'inspections
-- 5. Vérifier les contraintes CASCADE

-- ===============================================
-- 🔍 REQUÊTES DE VÉRIFICATION IMMÉDIATE
-- ===============================================

-- Vérifier si la table "inspections" est utilisée
SELECT 
  'TABLE INSPECTIONS (obsolète?)' as info,
  COUNT(*) as nombre_lignes
FROM inspections;

-- Vérifier si la table "vehicle_inspections" est utilisée
SELECT 
  'TABLE VEHICLE_INSPECTIONS (active)' as info,
  COUNT(*) as nombre_lignes
FROM vehicle_inspections;

-- Vérifier les documents liés à des inspections inexistantes
SELECT 
  'DOCUMENTS ORPHELINS' as probleme,
  COUNT(*) as nombre
FROM documents d
LEFT JOIN inspections i ON i.id = d.inspection_id
WHERE d.inspection_id IS NOT NULL AND i.id IS NULL;