-- ============================================
-- FIX PERMISSIONS ASSIGNATIONS
-- Date : 11 octobre 2025
-- Problème : Les contacts ne peuvent pas voir les missions qui leur sont assignées
-- Solution : Ajouter une policy pour que les contacts voient leurs assignations
-- ============================================

-- Ajouter une policy pour que les contacts voient les missions qui leur sont assignées
CREATE POLICY "Contacts can view their assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (
    -- Le contact peut voir si son email correspond à l'email du compte connecté
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ============================================
-- VÉRIFICATIONS
-- ============================================

SELECT 'Policy ajoutée : Les contacts peuvent voir leurs assignations !' as message;

-- Vérifier toutes les policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'mission_assignments'
ORDER BY policyname;
