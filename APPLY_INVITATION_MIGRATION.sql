-- ========================================
-- MIGRATION: Contact Invitation System
-- À exécuter dans le SQL Editor de Supabase
-- Database: bfrkthzovwpjrvqktdjn.supabase.co
-- ========================================

-- 1. Ajouter les colonnes d'invitation à la table contacts
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS invitation_status text DEFAULT 'accepted' 
    CHECK (invitation_status IN ('pending', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS invitation_responded_at timestamptz;

-- 2. Mettre à jour les contacts existants (ils sont déjà acceptés)
UPDATE contacts 
SET invitation_status = 'accepted',
    invitation_sent_at = created_at,
    invitation_responded_at = created_at
WHERE invitation_status IS NULL;

-- 3. Ajouter les index pour de meilleures performances
CREATE INDEX IF NOT EXISTS idx_contacts_invitation_status ON contacts(invitation_status);
CREATE INDEX IF NOT EXISTS idx_contacts_invited_user ON contacts(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_invited_by ON contacts(invited_by);

-- 4. Créer la vue pour les invitations reçues
CREATE OR REPLACE VIEW contact_invitations_received AS
SELECT 
  c.*,
  p.full_name as inviter_name,
  p.email as inviter_email,
  p.phone as inviter_phone
FROM contacts c
LEFT JOIN profiles p ON c.invited_by = p.id
WHERE c.invitation_status = 'pending';

-- 5. Créer la vue pour les invitations envoyées
CREATE OR REPLACE VIEW contact_invitations_sent AS
SELECT 
  c.*,
  p.full_name as invited_name,
  p.email as invited_email,
  p.phone as invited_phone
FROM contacts c
LEFT JOIN profiles p ON c.invited_user_id = p.id
WHERE c.invitation_status = 'pending';

-- 6. Fonction pour créer une invitation de contact
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

-- 7. Fonction pour accepter une invitation
CREATE OR REPLACE FUNCTION accept_contact_invitation(
  p_contact_id uuid,
  p_user_id uuid
) RETURNS json AS $$
DECLARE
  v_contact record;
  v_reverse_contact_id uuid;
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

  -- Créer le contact inverse (relation bidirectionnelle)
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
  ) 
  SELECT 
    p_user_id,
    v_contact.invited_by,
    v_contact.invited_by,
    v_contact.type,
    COALESCE((SELECT full_name FROM profiles WHERE id = v_contact.invited_by), 'Utilisateur'),
    (SELECT email FROM profiles WHERE id = v_contact.invited_by),
    (SELECT phone FROM profiles WHERE id = v_contact.invited_by),
    COALESCE((SELECT company FROM profiles WHERE id = v_contact.invited_by), ''),
    'accepted',
    v_contact.invitation_sent_at,
    now()
  RETURNING id INTO v_reverse_contact_id;

  RETURN json_build_object(
    'success', true,
    'contact_id', p_contact_id,
    'reverse_contact_id', v_reverse_contact_id,
    'message', 'Invitation acceptée avec succès'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Fonction pour refuser une invitation
CREATE OR REPLACE FUNCTION reject_contact_invitation(
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

-- 9. Donner les permissions
GRANT EXECUTE ON FUNCTION create_contact_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_contact_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION reject_contact_invitation TO authenticated;

-- 10. Mettre à jour les politiques RLS (elles existent déjà, on les recrée)
DROP POLICY IF EXISTS "Users can view own contacts and received invitations" ON contacts;
DROP POLICY IF EXISTS "Users can send contact invitations" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts or respond to invitations" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

-- Politique: Voir ses propres contacts et les invitations reçues
CREATE POLICY "Users can view own contacts and received invitations"
  ON contacts FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = invited_user_id
  );

-- Politique: Envoyer des invitations
CREATE POLICY "Users can send contact invitations"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique: Modifier ses contacts ou répondre aux invitations
CREATE POLICY "Users can update own contacts or respond to invitations"
  ON contacts FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR (auth.uid() = invited_user_id AND invitation_status = 'pending')
  );

-- Politique: Supprimer ses propres contacts
CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  USING (auth.uid() = user_id);

-- 11. Ajouter des commentaires
COMMENT ON COLUMN contacts.invitation_status IS 'Statut de l''invitation: pending, accepted, ou rejected';
COMMENT ON COLUMN contacts.invited_by IS 'Utilisateur qui a envoyé l''invitation';
COMMENT ON COLUMN contacts.invited_user_id IS 'Utilisateur qui a reçu l''invitation';
COMMENT ON COLUMN contacts.invitation_sent_at IS 'Date d''envoi de l''invitation';
COMMENT ON COLUMN contacts.invitation_responded_at IS 'Date de réponse à l''invitation';

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================
-- Vérification: SELECT * FROM contact_invitations_received;
-- Vérification: SELECT * FROM contact_invitations_sent;
