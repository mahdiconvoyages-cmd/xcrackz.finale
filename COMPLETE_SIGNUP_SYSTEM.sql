-- =============================================
-- COMPLÉMENTS SYSTÈME D'INSCRIPTION
-- Scripts manquants pour 100% fonctionnel
-- =============================================

-- ==========================================
-- 1. BUCKET STORAGE POUR AVATARS/LOGOS
-- ==========================================

-- Créer le bucket public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ==========================================
-- 2. POLICIES RLS STORAGE
-- ==========================================

-- Policy 1: Tout le monde peut uploader (pendant inscription)
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

-- Policy 2: Tout le monde peut lire (avatars publics)
DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
CREATE POLICY "Anyone can read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy 3: Utilisateurs authentifiés peuvent modifier leurs propres images
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy 4: Utilisateurs authentifiés peuvent supprimer leurs propres images
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ==========================================
-- 3. TRIGGER CRÉATION PROFILE AUTO
-- ==========================================

-- Fonction trigger : Créer profile automatiquement après signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Récupérer l'email (peut être null si signup par téléphone)
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  
  -- Créer le profil avec les métadonnées du wizard
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    user_type,
    company,
    siret,
    company_size,
    fleet_size,
    legal_address,
    bank_iban,
    avatar_url,
    logo_url,
    device_fingerprint,
    registration_ip,
    suspicious_flag,
    app_role,
    created_at
  )
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'individual'),
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'siret',
    NEW.raw_user_meta_data->>'company_size',
    COALESCE((NEW.raw_user_meta_data->>'fleet_size')::INTEGER, 0),
    NEW.raw_user_meta_data->>'legal_address',
    NEW.raw_user_meta_data->>'bank_iban',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'logo_url',
    NEW.raw_user_meta_data->>'device_fingerprint',
    NEW.raw_user_meta_data->>'registration_ip',
    COALESCE((NEW.raw_user_meta_data->>'suspicious_flag')::BOOLEAN, FALSE),
    COALESCE(NEW.raw_user_meta_data->>'app_role', 'convoyeur'),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    user_type = EXCLUDED.user_type,
    company = EXCLUDED.company,
    siret = EXCLUDED.siret,
    company_size = EXCLUDED.company_size,
    fleet_size = EXCLUDED.fleet_size,
    legal_address = EXCLUDED.legal_address,
    bank_iban = EXCLUDED.bank_iban,
    avatar_url = EXCLUDED.avatar_url,
    logo_url = EXCLUDED.logo_url,
    device_fingerprint = EXCLUDED.device_fingerprint,
    registration_ip = EXCLUDED.registration_ip,
    suspicious_flag = EXCLUDED.suspicious_flag,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur auth.users (appelé après chaque signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 4. FONCTION BACKUP : CRÉER PROFILE MANUELLEMENT
-- ==========================================

-- Utile si trigger échoue ou pour migration anciens comptes
CREATE OR REPLACE FUNCTION public.create_profile_for_existing_user(user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Récupérer l'utilisateur
  SELECT * INTO user_record FROM auth.users WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', user_id;
  END IF;
  
  -- Créer le profil si inexistant
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    created_at
  )
  VALUES (
    user_id,
    user_record.email,
    COALESCE(user_record.raw_user_meta_data->>'full_name', split_part(user_record.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Profile created for user %', user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage:
-- SELECT public.create_profile_for_existing_user('uuid-here');

-- ==========================================
-- 5. VÉRIFICATION SYSTÈME
-- ==========================================

-- Fonction pour vérifier que tout est OK
CREATE OR REPLACE FUNCTION public.check_signup_system_health()
RETURNS TABLE (
  component TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: Bucket avatars existe
  RETURN QUERY
  SELECT 
    'Storage Bucket'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') 
      THEN 'OK'::TEXT 
      ELSE 'MISSING'::TEXT 
    END,
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') 
      THEN 'Bucket avatars exists'::TEXT
      ELSE 'Run: INSERT INTO storage.buckets (id, name, public) VALUES (''avatars'', ''avatars'', true)'::TEXT
    END;
  
  -- Check 2: Trigger handle_new_user existe
  RETURN QUERY
  SELECT 
    'Auth Trigger'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_auth_user_created'
    ) THEN 'OK'::TEXT ELSE 'MISSING'::TEXT END,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_auth_user_created'
    ) THEN 'Trigger configured'::TEXT
    ELSE 'Run: CREATE TRIGGER on_auth_user_created...'::TEXT END;
  
  -- Check 3: Fonctions RPC existent
  RETURN QUERY
  SELECT 
    'RPC Functions'::TEXT,
    CASE WHEN (
      SELECT COUNT(*) FROM pg_proc 
      WHERE proname IN ('check_email_available', 'check_siret_available', 'check_signup_fraud')
    ) = 3 THEN 'OK'::TEXT ELSE 'INCOMPLETE'::TEXT END,
    'check_email_available, check_siret_available, check_signup_fraud'::TEXT;
  
  -- Check 4: Tables existent
  RETURN QUERY
  SELECT 
    'Tables'::TEXT,
    CASE WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('fraud_detection_logs', 'signup_blacklist', 'signup_attempts')
    ) = 3 THEN 'OK'::TEXT ELSE 'INCOMPLETE'::TEXT END,
    'fraud_detection_logs, signup_blacklist, signup_attempts'::TEXT;
  
  -- Check 5: Colonnes profiles existent
  RETURN QUERY
  SELECT 
    'Profile Columns'::TEXT,
    CASE WHEN (
      SELECT COUNT(*) FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name IN ('user_type', 'siret', 'device_fingerprint', 'company', 'bank_iban')
    ) = 5 THEN 'OK'::TEXT ELSE 'INCOMPLETE'::TEXT END,
    'user_type, siret, device_fingerprint, company, bank_iban'::TEXT;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. GRANT PERMISSIONS
-- ==========================================

-- Accès aux nouvelles fonctions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_profile_for_existing_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_signup_system_health() TO authenticated, anon;

-- ==========================================
-- 7. COMMENTAIRES
-- ==========================================

COMMENT ON FUNCTION public.handle_new_user IS 'Trigger automatique: crée profil après signup Supabase Auth';
COMMENT ON FUNCTION public.create_profile_for_existing_user IS 'Backup: crée profil manuellement pour un utilisateur existant';
COMMENT ON FUNCTION public.check_signup_system_health IS 'Diagnostic: vérifie que tous les composants sont configurés';

-- ==========================================
-- 8. TEST FINAL
-- ==========================================

-- Vérifier la santé du système
SELECT * FROM public.check_signup_system_health();

-- Résultat attendu:
-- component         | status | details
-- Storage Bucket    | OK     | Bucket avatars exists
-- Auth Trigger      | OK     | Trigger configured
-- RPC Functions     | OK     | check_email_available, check_siret_available, check_signup_fraud
-- Tables            | OK     | fraud_detection_logs, signup_blacklist, signup_attempts
-- Profile Columns   | OK     | user_type, siret, device_fingerprint, company, bank_iban

-- FIN DES COMPLÉMENTS
