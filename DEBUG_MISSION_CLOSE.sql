-- =============================================
-- DEBUG: Pourquoi la mission ne se clôture pas ?
-- =============================================

-- 1. Voir ta mission et ses colonnes d'assignation
SELECT 
  id,
  reference,
  status,
  user_id,
  assigned_user_id,
  driver_id,
  departure_inspection_completed,
  arrival_inspection_completed
FROM missions
WHERE status != 'completed'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Si driver_id existe, voir le contact associé
SELECT 
  m.id as mission_id,
  m.reference,
  m.driver_id,
  c.id as contact_id,
  c.user_id as contact_user_id,
  c.name as contact_name,
  c.type as contact_type
FROM missions m
LEFT JOIN contacts c ON c.id = m.driver_id
WHERE m.status != 'completed'
ORDER BY m.created_at DESC
LIMIT 5;

-- 3. Voir qui tu es (auth.uid() actuel)
SELECT 
  auth.uid() as current_user_id,
  u.email as current_user_email
FROM auth.users u
WHERE u.id = auth.uid();

-- 4. Test: Est-ce que la policy matche pour cette mission ?
-- (Remplace UUID_MISSION_ID par l'ID de ta mission qui bug)
-- SELECT 
--   m.id,
--   auth.uid() = m.user_id as "est_proprietaire",
--   auth.uid() = m.assigned_user_id as "est_assigne",
--   EXISTS (
--     SELECT 1 FROM contacts c 
--     WHERE c.id = m.driver_id 
--     AND c.user_id = auth.uid()
--   ) as "est_convoyeur_via_contact"
-- FROM missions m
-- WHERE m.id = 'UUID_MISSION_ID';
