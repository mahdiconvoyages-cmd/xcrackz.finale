-- =============================================
-- RLS FIX: Autoriser le convoyeur (driver contact) à clôturer la mission
-- Contexte: l'APK affiche "Mission non clôturée (droits RLS)" car
-- la policy existante compare auth.uid() à driver_id (contact.id) => toujours faux.
-- Solution: Relier driver_id -> contacts.user_id et autoriser update si auth.uid() correspond.
-- =============================================
DO $$
BEGIN
  -- Supprimer anciennes policies de complétion si présentes
  DROP POLICY IF EXISTS "Drivers and users can complete missions" ON missions;
  DROP POLICY IF EXISTS "missions_convoyeur_close" ON missions;
  DROP POLICY IF EXISTS "Users can update their own mission tracking links" ON missions; -- Policy obsolète et incorrecte

  -- Créer nouvelle policy robuste
  CREATE POLICY "missions_convoyeur_close"
  ON missions
  FOR UPDATE
  USING (
    -- Propriétaire de la mission
    auth.uid() = user_id OR
    -- Utilisateur directement assigné (colonne: assigned_user_id)
    auth.uid() = assigned_user_id OR
    -- Convoyeur via table contacts
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = missions.driver_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    auth.uid() = assigned_user_id OR
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = missions.driver_id
      AND c.user_id = auth.uid()
    )
  );

  RAISE NOTICE '✅ Nouvelle policy missions_convoyeur_close créée';
END $$;

-- Vérification rapide
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename='missions'
ORDER BY policyname;
