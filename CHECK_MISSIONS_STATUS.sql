-- Vérifier la contrainte check sur missions.status
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'missions'::regclass
  AND contype = 'c'  -- check constraint
  AND conname LIKE '%status%';

-- Alternative : Voir la définition de la table
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'missions' 
  AND column_name = 'status';
