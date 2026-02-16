-- ============================================
-- VÉRIFICATION CONTACTS ET ASSIGNATIONS
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Vérifier si votre email a un contact
SELECT 
  id,
  user_id,
  type,
  name,
  email,
  created_at
FROM contacts
WHERE email = auth.email();
-- ⚠️ Si cette requête retourne 0 ligne, c'est le problème !

-- 2. Vérifier toutes les assignations (sans RLS)
SELECT 
  ma.id,
  ma.mission_id,
  ma.contact_id,
  ma.status,
  c.name as contact_name,
  c.email as contact_email,
  m.reference as mission_reference
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
JOIN missions m ON m.id = ma.mission_id
ORDER BY ma.assigned_at DESC;

-- 3. Vérifier les assignations qui correspondent à votre email
SELECT 
  ma.id,
  ma.mission_id,
  ma.status,
  c.name as contact_name,
  c.email as contact_email,
  m.reference as mission_reference
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
JOIN missions m ON m.id = ma.mission_id
WHERE c.email = auth.email();

-- 4. Vérifier les policies RLS actives
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'mission_assignments'
ORDER BY policyname;

-- ============================================
-- SOLUTION SI AUCUN CONTACT TROUVÉ
-- ============================================

-- Si la requête #1 retourne 0 ligne, créez un contact avec votre email :
/*
INSERT INTO contacts (user_id, type, name, email, company)
VALUES (
  auth.uid(),
  'driver',  -- ou 'customer' ou 'supplier'
  'Votre Nom',
  auth.email(),
  'Votre Entreprise'
);
*/
