-- Vérifier les policies RLS sur shop_quote_requests
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
WHERE tablename = 'shop_quote_requests';

-- Vérifier si RLS est activé
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'shop_quote_requests';

-- Si pas de policies admin, créer une policy SELECT pour admin
/*
CREATE POLICY "Admins can view all quote requests"
ON shop_quote_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
*/
