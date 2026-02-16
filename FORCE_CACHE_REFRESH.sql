-- ===================================
-- FORCER LE RAFRAÎCHISSEMENT COMPLET DU CACHE POSTGREST
-- ===================================

-- Méthode 1: Signal PostgreSQL
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Méthode 2: Modifier le schéma pour forcer l'invalidation
-- (Ajouter puis supprimer une colonne temporaire)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS temp_refresh_column text;
ALTER TABLE contacts DROP COLUMN IF EXISTS temp_refresh_column;

-- Méthode 3: Recréer les vues pour forcer la détection
DROP VIEW IF EXISTS contact_invitations_received CASCADE;
DROP VIEW IF EXISTS contact_invitations_sent CASCADE;

CREATE VIEW contact_invitations_received AS
SELECT 
  c.*,
  p.full_name as inviter_name,
  p.email as inviter_email,
  p.phone as inviter_phone
FROM contacts c
LEFT JOIN profiles p ON c.invited_by = p.id
WHERE c.invitation_status = 'pending';

CREATE VIEW contact_invitations_sent AS
SELECT 
  c.*,
  p.full_name as invited_name,
  p.email as invited_email,
  p.phone as invited_phone
FROM contacts c
LEFT JOIN profiles p ON c.invited_user_id = p.id
WHERE c.invitation_status = 'pending';

-- Forcer à nouveau le signal
NOTIFY pgrst, 'reload schema';

-- Vérification: La colonne 'type' doit apparaître
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name = 'type';

-- Si la colonne 'type' n'apparaît pas, elle n'existe vraiment pas !
-- Dans ce cas, il faut la créer:
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'type'
    ) THEN
        -- La colonne n'existe pas, on la crée
        ALTER TABLE contacts ADD COLUMN type text NOT NULL DEFAULT 'customer'
            CHECK (type IN ('customer', 'driver', 'supplier'));
        RAISE NOTICE 'Colonne type créée';
    ELSE
        RAISE NOTICE 'Colonne type existe déjà';
    END IF;
END $$;

-- Forcer un dernier refresh
NOTIFY pgrst, 'reload schema';

SELECT 'Cache refresh forcé - Attendre 30 secondes avant de tester' as status;
