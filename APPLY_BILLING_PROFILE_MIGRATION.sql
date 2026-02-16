-- ============================================================================
-- MIGRATION COMBINÉE : Rendre le Profil Facturation 100% fonctionnel
-- À exécuter dans l'éditeur SQL de Supabase Dashboard
-- ============================================================================

-- 1. Ajouter billing_meta JSONB (stockage principal du profil facturation)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS billing_meta JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.billing_meta IS 'Billing profile: billing_address, billing_postal_code, billing_city, billing_email, iban, tva_number, payment_terms, company_logo_url, billing_profile_complete';

CREATE INDEX IF NOT EXISTS idx_profiles_billing_complete 
ON profiles ((billing_meta->>'billing_profile_complete'));

-- 2. Ajouter company_siret si manquant (le code utilise company_siret, pas siret)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_siret TEXT;

-- Si la colonne siret existe et contient des données, copier vers company_siret
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'siret'
  ) THEN
    UPDATE profiles SET company_siret = siret WHERE company_siret IS NULL AND siret IS NOT NULL;
    RAISE NOTICE 'Données copiées de siret vers company_siret';
  END IF;
END $$;

-- 3. S'assurer que company_name existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- 4. S'assurer que address existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT;

-- 5. Vérifier que le bucket storage 'avatars' existe (pour les logos)
-- NOTE: Ce bucket doit être créé via le Dashboard Supabase > Storage
-- Créer le bucket 'avatars' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Politique de lecture publique pour les logos
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Politique d'upload pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "Auth users upload avatars" ON storage.objects;
CREATE POLICY "Auth users upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Politique de mise à jour pour les propres fichiers
DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY "Users update own avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

-- Vérifier que toutes les colonnes existent
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('billing_meta', 'company_siret', 'company_name', 'address')
ORDER BY column_name;
