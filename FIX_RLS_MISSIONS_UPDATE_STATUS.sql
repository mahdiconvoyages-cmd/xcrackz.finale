-- Autoriser les convoyeurs (driver) et propriétaires (user) à clôturer leurs missions
-- Permet la mise à jour des champs status et arrival_inspection_completed

DO $$
BEGIN
  -- Supprimer la policy si elle existe
  DROP POLICY IF EXISTS "Drivers and users can complete missions" ON missions;

  -- Créer la policy d'UPDATE
  CREATE POLICY "Drivers and users can complete missions"
  ON missions
  FOR UPDATE
  USING (
    auth.uid() = user_id OR auth.uid() = driver_id
  )
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = driver_id
  );

  RAISE NOTICE 'Policy for mission completion created successfully';
END $$;

-- Vérifier
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY policyname;