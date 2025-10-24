-- ================================================
-- CRÉER UNE FONCTION POSTGRES POUR UPLOADER SANS RLS
-- ================================================
-- Cette fonction s'exécute avec les privilèges du propriétaire (SECURITY DEFINER)
-- et contourne complètement RLS

-- 1. Fonction pour uploader un fichier en contournant RLS
CREATE OR REPLACE FUNCTION public.upload_avatar_bypass_rls(
  p_user_id uuid,
  p_file_path text,
  p_public_url text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- S'exécute avec les privilèges du propriétaire
AS $$
DECLARE
  v_result json;
BEGIN
  -- Mettre à jour le profil avec la nouvelle URL d'avatar
  UPDATE profiles
  SET 
    avatar_url = p_public_url,
    updated_at = now()
  WHERE id = p_user_id;
  
  -- Retourner le résultat
  SELECT json_build_object(
    'success', true,
    'avatar_url', p_public_url,
    'updated_at', now()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 2. Fonction générique pour uploader dans storage en contournant RLS
CREATE OR REPLACE FUNCTION public.storage_upload_public(
  p_bucket_name text,
  p_file_path text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bucket_id text;
  v_result json;
BEGIN
  -- Récupérer l'ID du bucket
  SELECT id INTO v_bucket_id
  FROM storage.buckets
  WHERE name = p_bucket_name;
  
  IF v_bucket_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Bucket not found: ' || p_bucket_name
    );
  END IF;
  
  -- Insérer dans storage.objects (contourne RLS car SECURITY DEFINER)
  INSERT INTO storage.objects (
    bucket_id,
    name,
    owner,
    created_at,
    updated_at,
    last_accessed_at,
    metadata
  ) VALUES (
    v_bucket_id,
    p_file_path,
    auth.uid(),
    now(),
    now(),
    now(),
    '{}'::jsonb
  )
  ON CONFLICT (bucket_id, name) 
  DO UPDATE SET
    updated_at = now(),
    last_accessed_at = now();
  
  RETURN json_build_object(
    'success', true,
    'bucket_id', v_bucket_id,
    'path', p_file_path
  );
END;
$$;

-- 3. Donner les permissions
GRANT EXECUTE ON FUNCTION public.upload_avatar_bypass_rls TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_upload_public TO authenticated;

SELECT '✅ Fonctions créées pour contourner RLS sur storage' as status;

-- 4. TEST: Vérifier que les fonctions existent
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER (contourne RLS)'
    ELSE '❌ Normal'
  END as security_mode
FROM pg_proc
WHERE proname IN ('upload_avatar_bypass_rls', 'storage_upload_public')
AND pronamespace = 'public'::regnamespace;
