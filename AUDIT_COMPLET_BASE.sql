-- 🔍 AUDIT COMPLET - Profils, Contacts, Assignations

-- ========================================
-- PARTIE 1: TOUS LES PROFILS AUTH
-- ========================================

SELECT 
  '1️⃣ TOUS les profils Auth Supabase' as section,
  id as user_id,
  email,
  created_at
FROM profiles
ORDER BY email;

-- Attendu: 3 profils
-- - convoiexpress95@gmail.com
-- - mahdi.benamor1994@gmail.com
-- - mahdi.convoyages@gmail.com

-- ========================================
-- PARTIE 2: TOUS LES CONTACTS
-- ========================================

SELECT 
  '2️⃣ TOUS les contacts' as section,
  c.id as contact_id,
  c.email as contact_email,
  c.name as contact_name,
  c.user_id as contact_user_id,
  p.email as profil_lie,
  c.is_active,
  c.created_at,
  CASE 
    WHEN c.email = p.email THEN '✅ Contact = Profil'
    WHEN c.email != p.email THEN '⚠️ Contact ≠ Profil'
    WHEN p.email IS NULL THEN '❌ Contact sans profil'
    ELSE '❓'
  END as coherence
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
ORDER BY c.email, c.created_at DESC;

-- ========================================
-- PARTIE 3: CONTACTS EN DOUBLON
-- ========================================

SELECT 
  '3️⃣ Contacts en doublon' as section,
  c.email,
  COUNT(*) as nombre_contacts,
  array_agg(c.id::text) as contact_ids,
  array_agg(c.user_id::text) as user_ids
FROM contacts c
GROUP BY c.email
HAVING COUNT(*) > 1
ORDER BY c.email;

-- ========================================
-- PARTIE 4: ASSIGNATIONS EXISTANTES
-- ========================================

SELECT 
  '4️⃣ TOUTES les assignations' as section,
  ma.id as assignation_id,
  m.reference as mission_ref,
  c.email as contact_email,
  c.user_id as contact_user_id,
  ma.user_id as assignation_user_id,
  ma.assigned_by,
  p_assignation.email as assignation_user_email,
  p_assigned_by.email as assigned_by_email,
  ma.assigned_at,
  CASE 
    WHEN c.user_id = ma.user_id THEN '✅ Cohérent'
    ELSE '❌ INCOHÉRENT'
  END as coherence
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p_assignation ON p_assignation.id = ma.user_id
LEFT JOIN profiles p_assigned_by ON p_assigned_by.id = ma.assigned_by
ORDER BY ma.assigned_at DESC
LIMIT 20;

-- ========================================
-- PARTIE 5: FOCUS mahdi.convoyages
-- ========================================

SELECT 
  '5️⃣ Focus mahdi.convoyages - Profil' as section,
  id as user_id,
  email,
  created_at
FROM profiles
WHERE email = 'mahdi.convoyages@gmail.com';

SELECT 
  '5️⃣ Focus mahdi.convoyages - Contacts' as section,
  c.id as contact_id,
  c.email,
  c.user_id,
  p.email as profil_lie,
  c.created_at,
  CASE 
    WHEN c.user_id = (SELECT id FROM profiles WHERE email = 'mahdi.convoyages@gmail.com') 
    THEN '✅ Lié au BON profil'
    ELSE '❌ Lié à un AUTRE profil'
  END as statut
FROM contacts c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY c.created_at DESC;

SELECT 
  '5️⃣ Focus mahdi.convoyages - Assignations' as section,
  ma.id,
  m.reference,
  ma.user_id,
  p.email as user_email,
  ma.assigned_at
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
JOIN contacts c ON c.id = ma.contact_id
LEFT JOIN profiles p ON p.id = ma.user_id
WHERE c.email = 'mahdi.convoyages@gmail.com'
ORDER BY ma.assigned_at DESC;

-- ========================================
-- PARTIE 6: RECOMMANDATION
-- ========================================

SELECT 
  '6️⃣ Recommandation' as section,
  'Il devrait y avoir:' as conseil,
  '- 3 profils (1 par email)' as detail1,
  '- 3 contacts (1 par profil, email = profil.email)' as detail2,
  '- contact.user_id = profil.id où profil.email = contact.email' as detail3;
