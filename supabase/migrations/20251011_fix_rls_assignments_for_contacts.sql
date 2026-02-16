-- ============================================
-- FIX RLS POLICIES: Contact peut voir ses assignations
-- Date : 11 octobre 2025
-- Problème : Les contacts assignés ne peuvent pas voir leurs missions
-- Solution : Permettre aux contacts de voir les assignations où ils sont contact_id
-- ============================================

-- ============================================
-- SUPPRIMER L'ANCIENNE POLICY SELECT
-- ============================================

DROP POLICY IF EXISTS "Users can view own assignments" ON mission_assignments;

-- ============================================
-- CRÉER UNE NOUVELLE POLICY SELECT AMÉLIORÉE
-- ============================================

-- Cette policy permet de voir:
-- 1. Les assignations créées par soi (user_id = auth.uid())
-- 2. Les assignations où on est le contact assigné (via contacts.user_id)
CREATE POLICY "Users and contacts can view assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM contacts 
      WHERE contacts.id = mission_assignments.contact_id 
      AND contacts.user_id = auth.uid()
    )
  );

-- ============================================
-- POLICY UPDATE: Contact peut modifier le statut
-- ============================================

-- Supprimer l'ancienne policy UPDATE
DROP POLICY IF EXISTS "Users can update own assignments" ON mission_assignments;

-- Nouvelle policy : Le créateur ET le contact peuvent modifier
CREATE POLICY "Users and contacts can update assignments"
  ON mission_assignments
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

-- ============================================
-- VÉRIFICATIONS
-- ============================================

SELECT 'Policies RLS mission_assignments corrigées !' as message;

-- Vérifier les policies actives
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'mission_assignments'
ORDER BY cmd, policyname;

-- ============================================
-- TEST DE LA POLICY
-- ============================================

-- Pour tester, créez un contact pour votre compte :
/*
INSERT INTO contacts (user_id, type, name, email, phone, company)
VALUES (
  auth.uid(),
  'driver',
  'Mon Nom',
  'mon.email@example.com',
  '+33 6 12 34 56 78',
  'Ma Société'
);
*/

-- Puis assignez une mission à ce contact :
/*
INSERT INTO mission_assignments (mission_id, contact_id, user_id, assigned_by)
VALUES (
  'id-mission-existante',
  (SELECT id FROM contacts WHERE user_id = auth.uid() LIMIT 1),
  auth.uid(),
  auth.uid()
);
*/

-- Ensuite, vous devriez pouvoir la voir avec :
/*
SELECT * FROM mission_assignments
WHERE contact_id = (SELECT id FROM contacts WHERE user_id = auth.uid() LIMIT 1);
*/
