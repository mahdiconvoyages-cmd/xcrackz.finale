-- ================================================
-- FORCER LE RECHARGEMENT DU SCHÉMA POSTGREST
-- ================================================

-- Méthode 1: Recharger le schéma via fonction
SELECT extensions.http_post(
  'http://localhost:3000/rpc/reload_schema',
  '',
  'application/json'
);

-- Méthode 2: Notifier PostgREST (plusieurs fois)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Méthode 3: Forcer une reconnexion en modifiant le schéma
COMMENT ON TABLE missions IS 'Table des missions - Schema reloaded at ' || now()::text;

-- Vérifier que la colonne existe vraiment
SELECT 
  'COLONNE EXISTE?' as check_type,
  EXISTS(
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'missions' 
    AND column_name = 'assigned_to_user_id'
  ) as column_exists;

-- Afficher les permissions sur la colonne
SELECT 
  table_name,
  column_name,
  is_updatable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'missions'
AND column_name = 'assigned_to_user_id';

SELECT '⚠️ Si toujours pas de colonne visible, redémarrez le projet Supabase dans le Dashboard' as note;
