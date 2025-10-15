-- Add contact invitation system
-- This migration adds fields to support bidirectional contact invitations

-- Add new columns to contacts table
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS invitation_status text DEFAULT 'pending' 
    CHECK (invitation_status IN ('pending', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS invitation_responded_at timestamptz;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_contacts_invitation_status ON contacts(invitation_status);
CREATE INDEX IF NOT EXISTS idx_contacts_invited_user ON contacts(invited_user_id);

-- Create a view for pending invitations (received by user)
CREATE OR REPLACE VIEW contact_invitations_received AS
SELECT 
  c.*,
  p.full_name as inviter_name,
  p.email as inviter_email,
  p.phone as inviter_phone
FROM contacts c
LEFT JOIN profiles p ON c.invited_by = p.id
WHERE c.invitation_status = 'pending';

-- Create a view for sent invitations (sent by user)
CREATE OR REPLACE VIEW contact_invitations_sent AS
SELECT 
  c.*,
  p.full_name as invited_name,
  p.email as invited_email,
  p.phone as invited_phone
FROM contacts c
LEFT JOIN profiles p ON c.invited_user_id = p.id
WHERE c.invitation_status = 'pending';

-- Function to create bidirectional contact relationship
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
  v_reverse_contact_id uuid;
BEGIN
  -- Check if invitation already exists
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

  -- Check if reverse invitation exists
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

  -- Create contact from inviter to invited user
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
    p_company,
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

-- Function to accept contact invitation
CREATE OR REPLACE FUNCTION accept_contact_invitation(
  p_contact_id uuid,
  p_user_id uuid
) RETURNS json AS $$
DECLARE
  v_contact record;
  v_reverse_contact_id uuid;
BEGIN
  -- Get the invitation
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

  -- Update invitation status
  UPDATE contacts 
  SET 
    invitation_status = 'accepted',
    invitation_responded_at = now()
  WHERE id = p_contact_id;

  -- Create reverse contact (bidirectional relationship)
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
    (SELECT full_name FROM profiles WHERE id = v_contact.invited_by),
    (SELECT email FROM profiles WHERE id = v_contact.invited_by),
    (SELECT phone FROM profiles WHERE id = v_contact.invited_by),
    (SELECT company FROM profiles WHERE id = v_contact.invited_by),
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

-- Function to reject contact invitation
CREATE OR REPLACE FUNCTION reject_contact_invitation(
  p_contact_id uuid,
  p_user_id uuid
) RETURNS json AS $$
BEGIN
  -- Check if invitation exists and is pending
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

  -- Update invitation status to rejected
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_contact_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_contact_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION reject_contact_invitation TO authenticated;

-- RLS policies for contact invitations
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own contacts and invitations they received
CREATE POLICY "Users can view own contacts and received invitations"
  ON contacts FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = invited_user_id
  );

-- Policy: Users can insert contacts (send invitations)
CREATE POLICY "Users can send contact invitations"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own contacts or respond to invitations
CREATE POLICY "Users can update own contacts or respond to invitations"
  ON contacts FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR (auth.uid() = invited_user_id AND invitation_status = 'pending')
  );

-- Policy: Users can delete their own contacts
CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON COLUMN contacts.invitation_status IS 'Status of contact invitation: pending, accepted, or rejected';
COMMENT ON COLUMN contacts.invited_by IS 'User who sent the invitation';
COMMENT ON COLUMN contacts.invited_user_id IS 'User who received the invitation';
COMMENT ON COLUMN contacts.invitation_sent_at IS 'When the invitation was sent';
COMMENT ON COLUMN contacts.invitation_responded_at IS 'When the invitation was accepted/rejected';
