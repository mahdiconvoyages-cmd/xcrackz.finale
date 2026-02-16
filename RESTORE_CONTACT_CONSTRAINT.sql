-- ================================================
-- REMETTRE LA CONTRAINTE ORIGINALE: contact_id → contacts(id)
-- ================================================

-- 1. Supprimer la contrainte actuelle (qui pointe vers auth.users)
ALTER TABLE mission_assignments 
DROP CONSTRAINT IF EXISTS mission_assignments_contact_id_fkey;

-- 2. Recréer la contrainte pour pointer vers la table contacts
ALTER TABLE mission_assignments
ADD CONSTRAINT mission_assignments_contact_id_fkey
FOREIGN KEY (contact_id)
REFERENCES contacts(id)
ON DELETE CASCADE;

-- 3. Forcer le refresh
NOTIFY pgrst, 'reload schema';

SELECT '✅ Contrainte restaurée: contact_id → contacts(id)' as status;
