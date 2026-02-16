-- ============================================
-- FIX POLICY CONTACTS
-- Date : 11 octobre 2025
-- Problème : La policy essaie d'accéder à auth.users (interdit)
-- Solution : Utiliser auth.email() directement
-- ============================================

-- Supprimer l'ancienne policy qui cause l'erreur
DROP POLICY IF EXISTS "Contacts can view their assignments" ON mission_assignments;

-- Recréer la policy avec la bonne approche
CREATE POLICY "Contacts can view their assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (
    -- Le contact peut voir si son email correspond à l'email du compte connecté
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.email = auth.email()
    )
  );

-- ============================================
-- VÉRIFICATIONS
-- ============================================

SELECT 'Policy corrigée : Utilise auth.email() au lieu de auth.users !' as message;

-- Vérifier toutes les policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'mission_assignments'
ORDER BY policyname;
