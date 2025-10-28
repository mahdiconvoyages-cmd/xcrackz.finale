-- ============================================
-- FIX: Corriger handle_new_user pour auto-remplir le profil
-- ============================================

-- Vérifier les colonnes de la table profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Recréer la fonction handle_new_user avec auto-remplissage
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Extraire le nom complet depuis raw_user_meta_data si disponible
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  
  -- Essayer de séparer prénom/nom (basique)
  IF v_full_name != '' AND position(' ' IN v_full_name) > 0 THEN
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := substring(v_full_name FROM position(' ' IN v_full_name) + 1);
  ELSE
    v_first_name := v_full_name;
    v_last_name := '';
  END IF;
  
  -- Créer le profil avec les données disponibles
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    phone,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NULLIF(v_full_name, ''),
    NULLIF(v_first_name, ''),
    NULLIF(v_last_name, ''),
    NEW.phone,
    NOW(),
    NOW()
  );

  -- Créer les crédits
  INSERT INTO public.user_credits (user_id, balance, created_at, updated_at)
  VALUES (NEW.id, 0, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Créer l'abonnement
  INSERT INTO public.subscriptions (user_id, plan, status, created_at, updated_at)
  VALUES (NEW.id, 'free', 'active', NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Logger l'erreur mais ne pas bloquer la création du compte
    RAISE WARNING 'Erreur dans handle_new_user: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reload PostgREST
NOTIFY pgrst, 'reload schema';
