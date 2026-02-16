-- ============================================
-- FIX FINAL : POLICIES RLS MISSION_ASSIGNMENTS
-- Date : 11 octobre 2025
-- Problème : Les assignations ne sont pas visibles car la policy
--            basée sur contacts.email ne fonctionne pas côté client
-- Solution : Utiliser ALSO la policy user_id pour les créateurs
-- ============================================

-- La policy "Users can view own assignments" existe déjà et fonctionne
-- Elle permet à l'utilisateur qui a CRÉÉ l'assignation de la voir (via user_id)

-- Mais la policy "Contacts can view their assignments" ne fonctionne pas
-- car auth.email() n'est pas toujours disponible côté client

-- DIAGNOSTIC : Vérifier quelles assignations l'utilisateur peut voir
-- Cette requête devrait retourner des résultats si la policy fonctionne
-- SELECT * FROM mission_assignments;

-- ============================================
-- SOLUTION : Simplifier la policy contact
-- ============================================

-- Supprimer l'ancienne policy qui ne fonctionne pas
DROP POLICY IF EXISTS "Contacts can view their assignments" ON mission_assignments;

-- Créer une nouvelle policy qui vérifie si l'utilisateur connecté
-- a un contact avec le même user_id (pas email)
CREATE POLICY "Contacts can view their assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (
    -- Le contact peut voir si son user_id correspond au user_id du compte connecté
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

-- ============================================
-- VÉRIFICATIONS
-- ============================================

SELECT '✅ Policy corrigée : Utilise contacts.user_id au lieu de contacts.email !' as message;

-- Vérifier toutes les policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'mission_assignments'
ORDER BY policyname;

-- Test : Cette requête devrait maintenant retourner vos assignations
-- SELECT 
--   ma.*,
--   c.name as contact_name,
--   m.reference as mission_reference
-- FROM mission_assignments ma
-- JOIN contacts c ON c.id = ma.contact_id
-- JOIN missions m ON m.id = ma.mission_id;
