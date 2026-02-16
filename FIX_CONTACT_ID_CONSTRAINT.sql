-- ================================================
-- CORRIGER LA CONTRAINTE contact_id DANS mission_assignments
-- ================================================

-- 1. Vérifier la contrainte actuelle
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'mission_assignments'
AND tc.constraint_type = 'FOREIGN KEY';

-- 2. Supprimer l'ancienne contrainte (qui pointe vers contacts)
ALTER TABLE mission_assignments 
DROP CONSTRAINT IF EXISTS mission_assignments_contact_id_fkey;

-- 3. Recréer la contrainte pour pointer vers auth.users
ALTER TABLE mission_assignments
ADD CONSTRAINT mission_assignments_contact_id_fkey
FOREIGN KEY (contact_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 4. Vérifier que le contact existe dans auth.users
SELECT 
  'VÉRIFICATION DU CONTACT' as check_type,
  id,
  email
FROM auth.users
WHERE id = 'c37f15d6-545a-4792-9697-de03991b4f17';

-- 5. Forcer le refresh du schéma
NOTIFY pgrst, 'reload schema';

SELECT '✅ Contrainte corrigée: contact_id → auth.users(id)' as status;
