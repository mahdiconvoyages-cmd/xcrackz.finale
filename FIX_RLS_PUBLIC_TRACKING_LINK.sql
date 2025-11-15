-- Policy pour permettre aux utilisateurs de mettre à jour le lien de tracking public
-- de leurs propres missions

-- Vérifier si la policy existe déjà
DO $$ 
BEGIN
  -- Drop si existe
  DROP POLICY IF EXISTS "Users can update their own mission tracking links" ON missions;
  
  -- Créer la nouvelle policy
  CREATE POLICY "Users can update their own mission tracking links"
  ON missions
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR auth.uid() = driver_id
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR auth.uid() = driver_id
  );
  
  RAISE NOTICE 'Policy created successfully';
END $$;

-- Vérifier les policies existantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'missions'
ORDER BY policyname;
