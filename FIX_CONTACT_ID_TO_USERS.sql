-- Mettre à jour la contrainte FK pour pointer vers auth.users au lieu de contacts
-- Cela permet d'assigner directement à n'importe quel utilisateur de la plateforme

-- ÉTAPE 1: Supprimer la contrainte FK existante (sinon l'UPDATE sera bloqué)
ALTER TABLE mission_assignments 
DROP CONSTRAINT IF EXISTS mission_assignments_contact_id_fkey;

-- ÉTAPE 2: Migrer les données existantes (contact_id → user_id du contact)
UPDATE mission_assignments ma
SET contact_id = c.user_id
FROM contacts c
WHERE ma.contact_id = c.id
AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id);

-- ÉTAPE 3: Créer la nouvelle contrainte FK vers auth.users
ALTER TABLE mission_assignments 
ADD CONSTRAINT mission_assignments_contact_id_fkey 
FOREIGN KEY (contact_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Vérification
SELECT 
  ma.id,
  ma.contact_id,
  u.email as assigned_to_email,
  m.reference as mission_ref
FROM mission_assignments ma
JOIN auth.users u ON u.id = ma.contact_id
JOIN missions m ON m.id = ma.mission_id
ORDER BY ma.created_at DESC;
