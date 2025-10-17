-- 🔧 FIX: Corriger les assignations existantes

-- ========================================
-- 1. VÉRIFIER LES ASSIGNATIONS AVEC MAUVAIS user_id
-- ========================================

SELECT 
  '1️⃣ Assignations à corriger' as etape,
  ma.id as assignation_id,
  m.reference as mission,
  c.name as contact_assigne,
  c.user_id as user_id_correct,
  ma.user_id as user_id_actuel,
  CASE 
    WHEN c.user_id = ma.user_id THEN '✅ OK'
    WHEN c.user_id IS NULL THEN '⚠️ Contact sans user_id'
    ELSE '❌ À CORRIGER'
  END as etat
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
WHERE c.user_id != ma.user_id OR c.user_id IS NULL
ORDER BY ma.created_at DESC;

-- ========================================
-- 2. CORRIGER TOUTES LES ASSIGNATIONS
-- ========================================

-- Cette commande met à jour le user_id pour correspondre au contact assigné
UPDATE mission_assignments ma
SET user_id = (
  SELECT c.user_id 
  FROM contacts c 
  WHERE c.id = ma.contact_id
)
WHERE EXISTS (
  SELECT 1 
  FROM contacts c 
  WHERE c.id = ma.contact_id 
  AND c.user_id IS NOT NULL
  AND c.user_id != ma.user_id
);

-- ========================================
-- 3. VÉRIFICATION APRÈS CORRECTION
-- ========================================

SELECT 
  '3️⃣ Vérification finale' as etape,
  ma.id,
  m.reference,
  c.name as contact,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  CASE 
    WHEN c.user_id = ma.user_id THEN '✅ Corrigé'
    ELSE '❌ Encore un problème'
  END as resultat
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
ORDER BY ma.created_at DESC;

-- ========================================
-- 4. COMBIEN D'ASSIGNATIONS CORRIGÉES ?
-- ========================================

SELECT 
  '4️⃣ Résumé' as info,
  COUNT(*) as total_assignations,
  COUNT(*) FILTER (WHERE c.user_id = ma.user_id) as correctes,
  COUNT(*) FILTER (WHERE c.user_id != ma.user_id) as incorrectes
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id;
