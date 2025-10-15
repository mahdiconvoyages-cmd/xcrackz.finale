-- ========================================
-- TEST DIRECT DES FONCTIONS SQL
-- ========================================

-- Test 1: Vérifier que la fonction existe vraiment
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'create_contact_invitation';

-- Test 2: Appeler directement la fonction (remplacez les UUIDs par des vrais)
-- EXEMPLE - NE PAS EXÉCUTER TEL QUEL, adapter avec vos UUIDs
/*
SELECT create_contact_invitation(
    'votre-user-id'::uuid,           -- p_inviter_id
    'id-utilisateur-invité'::uuid,   -- p_invited_user_id
    'customer'::text,                -- p_contact_type
    'Test Contact'::text,            -- p_name
    'test@example.com'::text,        -- p_email
    '0612345678'::text,              -- p_phone
    'Test Company'::text             -- p_company
);
*/

-- Test 3: Vérifier les permissions
SELECT 
    grantee, 
    privilege_type,
    routine_name
FROM information_schema.routine_privileges 
WHERE routine_name = 'create_contact_invitation';

-- Test 4: Vérifier que PostgREST peut voir la fonction
-- Cette requête simule ce que PostgREST voit
SELECT 
    n.nspname as schema,
    p.proname as name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%invitation%';

-- ========================================
-- FORCER LE RAFRAÎCHISSEMENT POSTGREST
-- ========================================

-- Méthode 1: NOTIFY (déjà fait mais on refait)
NOTIFY pgrst, 'reload schema';

-- Méthode 2: Recréer la fonction avec OR REPLACE (force la mise à jour)
CREATE OR REPLACE FUNCTION create_contact_invitation(
  p_inviter_id uuid,
  p_invited_user_id uuid,
  p_contact_type text,
  p_name text,
  p_email text,
  p_phone text,
  p_company text
) RETURNS json AS $$
DECLARE
  v_contact_id uuid;
BEGIN
  -- Vérifier si une invitation existe déjà
  IF EXISTS (
    SELECT 1 FROM contacts 
    WHERE user_id = p_inviter_id 
    AND invited_user_id = p_invited_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invitation déjà envoyée'
    );
  END IF;

  -- Vérifier si une invitation inverse existe
  IF EXISTS (
    SELECT 1 FROM contacts 
    WHERE user_id = p_invited_user_id 
    AND invited_user_id = p_inviter_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'L''utilisateur vous a déjà envoyé une invitation'
    );
  END IF;

  -- Créer le contact avec statut pending
  INSERT INTO contacts (
    user_id,
    invited_by,
    invited_user_id,
    type,
    name,
    email,
    phone,
    company,
    invitation_status,
    invitation_sent_at
  ) VALUES (
    p_inviter_id,
    p_inviter_id,
    p_invited_user_id,
    p_contact_type,
    p_name,
    p_email,
    p_phone,
    COALESCE(p_company, ''),
    'pending',
    now()
  ) RETURNING id INTO v_contact_id;

  RETURN json_build_object(
    'success', true,
    'contact_id', v_contact_id,
    'message', 'Invitation envoyée avec succès'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redonner les permissions
GRANT EXECUTE ON FUNCTION create_contact_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION create_contact_invitation TO anon;

-- Forcer à nouveau le refresh
NOTIFY pgrst, 'reload schema';

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================

SELECT 'Fonction créée et permissions accordées' as status;
SELECT proname FROM pg_proc WHERE proname = 'create_contact_invitation';
