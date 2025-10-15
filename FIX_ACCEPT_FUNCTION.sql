-- ========================================
-- CORRECTION DE LA FONCTION accept_contact_invitation
-- ========================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS accept_contact_invitation CASCADE;

-- Recréer la fonction SANS référence à profiles.company
CREATE FUNCTION accept_contact_invitation(
  p_contact_id uuid,
  p_user_id uuid
) RETURNS json AS $$
DECLARE
  v_contact record;
  v_reverse_contact_id uuid;
  v_inviter_name text;
  v_inviter_email text;
  v_inviter_phone text;
BEGIN
  -- Récupérer l'invitation
  SELECT * INTO v_contact FROM contacts 
  WHERE id = p_contact_id 
  AND invited_user_id = p_user_id
  AND invitation_status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invitation introuvable ou déjà traitée'
    );
  END IF;

  -- Mettre à jour le statut de l'invitation
  UPDATE contacts 
  SET 
    invitation_status = 'accepted',
    invitation_responded_at = now()
  WHERE id = p_contact_id;

  -- Récupérer les infos de l'expéditeur depuis profiles
  SELECT 
    COALESCE(full_name, first_name || ' ' || last_name, 'Utilisateur') as name,
    email,
    phone
  INTO v_inviter_name, v_inviter_email, v_inviter_phone
  FROM profiles 
  WHERE id = v_contact.invited_by;

  -- Créer le contact inverse (relation bidirectionnelle)
  -- SANS la colonne company de profiles (on utilise company du contact original)
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
    invitation_sent_at,
    invitation_responded_at
  ) VALUES (
    p_user_id,
    v_contact.invited_by,
    v_contact.invited_by,
    v_contact.type,
    v_inviter_name,
    v_inviter_email,
    v_inviter_phone,
    COALESCE(v_contact.company, ''), -- Utiliser company du contact, pas de profiles
    'accepted',
    v_contact.invitation_sent_at,
    now()
  ) RETURNING id INTO v_reverse_contact_id;

  RETURN json_build_object(
    'success', true,
    'contact_id', p_contact_id,
    'reverse_contact_id', v_reverse_contact_id,
    'message', 'Invitation acceptée avec succès'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION accept_contact_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_contact_invitation TO anon;

-- Même correction pour reject_contact_invitation (au cas où)
DROP FUNCTION IF EXISTS reject_contact_invitation CASCADE;

CREATE FUNCTION reject_contact_invitation(
  p_contact_id uuid,
  p_user_id uuid
) RETURNS json AS $$
BEGIN
  -- Vérifier que l'invitation existe et est en attente
  IF NOT EXISTS (
    SELECT 1 FROM contacts 
    WHERE id = p_contact_id 
    AND invited_user_id = p_user_id
    AND invitation_status = 'pending'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invitation introuvable ou déjà traitée'
    );
  END IF;

  -- Mettre à jour le statut à rejected
  UPDATE contacts 
  SET 
    invitation_status = 'rejected',
    invitation_responded_at = now()
  WHERE id = p_contact_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Invitation refusée'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION reject_contact_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION reject_contact_invitation TO anon;

-- Forcer le refresh du cache
NOTIFY pgrst, 'reload schema';

-- Vérification
SELECT 'Fonctions corrigées - Tester maintenant' as status;
SELECT proname FROM pg_proc WHERE proname LIKE '%invitation%';
