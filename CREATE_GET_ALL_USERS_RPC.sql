-- Créer une fonction pour accéder à auth.users depuis le client
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, email
  FROM auth.users
  ORDER BY email;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
