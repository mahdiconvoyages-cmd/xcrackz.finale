-- ========================================
-- VÉRIFICATION ET CORRECTION DE LA MIGRATION
-- Base de données: bfrkthzovwpjrvqktdjn.supabase.co
-- ========================================

-- ÉTAPE 1: Vérifier si les colonnes existent
DO $$ 
BEGIN
    RAISE NOTICE '=== VÉRIFICATION DES COLONNES ===';
END $$;

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name IN ('invitation_status', 'invited_by', 'invited_user_id', 'invitation_sent_at', 'invitation_responded_at')
ORDER BY column_name;

-- Si aucune ligne retournée ci-dessus, exécuter la suite

-- ÉTAPE 2: Ajouter les colonnes si elles n'existent pas
DO $$ 
BEGIN
    -- Ajouter invitation_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'invitation_status'
    ) THEN
        ALTER TABLE contacts ADD COLUMN invitation_status text DEFAULT 'accepted' 
            CHECK (invitation_status IN ('pending', 'accepted', 'rejected'));
        RAISE NOTICE 'Colonne invitation_status ajoutée';
    ELSE
        RAISE NOTICE 'Colonne invitation_status existe déjà';
    END IF;

    -- Ajouter invited_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE contacts ADD COLUMN invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Colonne invited_by ajoutée';
    ELSE
        RAISE NOTICE 'Colonne invited_by existe déjà';
    END IF;

    -- Ajouter invited_user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'invited_user_id'
    ) THEN
        ALTER TABLE contacts ADD COLUMN invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Colonne invited_user_id ajoutée';
    ELSE
        RAISE NOTICE 'Colonne invited_user_id existe déjà';
    END IF;

    -- Ajouter invitation_sent_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'invitation_sent_at'
    ) THEN
        ALTER TABLE contacts ADD COLUMN invitation_sent_at timestamptz DEFAULT now();
        RAISE NOTICE 'Colonne invitation_sent_at ajoutée';
    ELSE
        RAISE NOTICE 'Colonne invitation_sent_at existe déjà';
    END IF;

    -- Ajouter invitation_responded_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'invitation_responded_at'
    ) THEN
        ALTER TABLE contacts ADD COLUMN invitation_responded_at timestamptz;
        RAISE NOTICE 'Colonne invitation_responded_at ajoutée';
    ELSE
        RAISE NOTICE 'Colonne invitation_responded_at existe déjà';
    END IF;
END $$;

-- ÉTAPE 3: Mettre à jour les contacts existants
UPDATE contacts 
SET invitation_status = 'accepted',
    invitation_sent_at = COALESCE(invitation_sent_at, created_at),
    invitation_responded_at = COALESCE(invitation_responded_at, created_at)
WHERE invitation_status IS NULL OR invitation_status = '';

-- ÉTAPE 4: Créer les index
CREATE INDEX IF NOT EXISTS idx_contacts_invitation_status ON contacts(invitation_status);
CREATE INDEX IF NOT EXISTS idx_contacts_invited_user ON contacts(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_invited_by ON contacts(invited_by);

-- ÉTAPE 5: Supprimer les anciennes vues et fonctions
DROP VIEW IF EXISTS contact_invitations_received CASCADE;
DROP VIEW IF EXISTS contact_invitations_sent CASCADE;
DROP FUNCTION IF EXISTS create_contact_invitation CASCADE;
DROP FUNCTION IF EXISTS accept_contact_invitation CASCADE;
DROP FUNCTION IF EXISTS reject_contact_invitation CASCADE;

-- ÉTAPE 6: Créer la vue pour les invitations reçues
CREATE VIEW contact_invitations_received AS
SELECT 
  c.*,
  p.full_name as inviter_name,
  p.email as inviter_email,
  p.phone as inviter_phone
FROM contacts c
LEFT JOIN profiles p ON c.invited_by = p.id
WHERE c.invitation_status = 'pending';

-- ÉTAPE 7: Créer la vue pour les invitations envoyées
CREATE VIEW contact_invitations_sent AS
SELECT 
  c.*,
  p.full_name as invited_name,
  p.email as invited_email,
  p.phone as invited_phone
FROM contacts c
LEFT JOIN profiles p ON c.invited_user_id = p.id
WHERE c.invitation_status = 'pending';

-- ÉTAPE 8: Fonction pour créer une invitation
CREATE FUNCTION create_contact_invitation(
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

-- ÉTAPE 9: Fonction pour accepter une invitation
CREATE FUNCTION accept_contact_invitation(
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

-- ÉTAPE 10: Fonction pour refuser une invitation
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

-- ÉTAPE 11: Donner les permissions
GRANT EXECUTE ON FUNCTION create_contact_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_contact_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION reject_contact_invitation TO authenticated;

-- ÉTAPE 12: Mettre à jour les politiques RLS
DROP POLICY IF EXISTS "Users can view own contacts and received invitations" ON contacts;
DROP POLICY IF EXISTS "Users can send contact invitations" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts or respond to invitations" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

CREATE POLICY "Users can view own contacts and received invitations"
  ON contacts FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = invited_user_id
  );

CREATE POLICY "Users can send contact invitations"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts or respond to invitations"
  ON contacts FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR (auth.uid() = invited_user_id AND invitation_status = 'pending')
  );

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  USING (auth.uid() = user_id);

-- ÉTAPE 13: Forcer le rafraîchissement du cache PostgREST
NOTIFY pgrst, 'reload schema';

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================

DO $$ 
BEGIN
    RAISE NOTICE '=== VÉRIFICATION FINALE ===';
END $$;

-- Vérifier les colonnes
SELECT 'COLONNES:' as type, COUNT(*) as count
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name IN ('invitation_status', 'invited_by', 'invited_user_id', 'invitation_sent_at', 'invitation_responded_at');

-- Vérifier les vues
SELECT 'VUES:' as type, COUNT(*) as count
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname LIKE '%invitation%';

-- Vérifier les fonctions
SELECT 'FONCTIONS:' as type, COUNT(*) as count
FROM pg_proc 
WHERE proname LIKE '%invitation%';

-- Afficher les détails
SELECT 'LISTE DES FONCTIONS:' as info;
SELECT proname as function_name 
FROM pg_proc 
WHERE proname LIKE '%invitation%';

-- ========================================
-- FIN - Migration complète et vérifiée
-- ========================================
