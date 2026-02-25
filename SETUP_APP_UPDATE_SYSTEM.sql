-- ================================================================
-- Système de mise à jour automatique de l'APK (OTA Update)
-- Exécuter dans le SQL Editor de Supabase Dashboard
-- ================================================================

-- 1. Supprimer et recréer la table proprement
DROP TABLE IF EXISTS app_versions CASCADE;

CREATE TABLE public.app_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    version text NOT NULL,                          -- Ex: '3.9.0'
    build_number integer NOT NULL,                  -- Ex: 48 (doit correspond au +XX dans pubspec.yaml)
    download_url text NOT NULL,                     -- URL de téléchargement de l'APK
    release_notes text,                             -- Notes de mise à jour (affiché à l'utilisateur)
    is_mandatory boolean DEFAULT false,             -- Si true, l'utilisateur ne peut pas ignorer
    platform text DEFAULT 'android' NOT NULL,       -- 'android' ou 'ios'
    min_supported_version text,                     -- Version minimale supportée (force la MAJ si en dessous)
    file_size_mb numeric(10,2),                     -- Taille du fichier en MB (pour l'affichage)
    created_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true                  -- Seule la version active est proposée
);

-- Index pour récupérer rapidement la dernière version active
CREATE INDEX idx_app_versions_active ON app_versions (platform, is_active, build_number DESC);

-- Commentaire
COMMENT ON TABLE app_versions IS 'Versions de l''application pour mise à jour OTA (sans Google Play)';

-- 2. RLS Policies - lecture publique, écriture admin uniquement
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les versions (nécessaire pour vérifier les MAJ)
CREATE POLICY "app_versions_read_all" ON app_versions
    FOR SELECT USING (true);

-- Seuls les admins peuvent insérer/modifier
CREATE POLICY "app_versions_admin_insert" ON app_versions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND app_role IN ('admin', 'super_admin'))
    );

CREATE POLICY "app_versions_admin_update" ON app_versions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND app_role IN ('admin', 'super_admin'))
    );

-- 3. Fonction RPC (noms de sortie préfixés out_ pour éviter l'ambiguïté)
DROP FUNCTION IF EXISTS get_latest_app_version;
CREATE OR REPLACE FUNCTION get_latest_app_version(p_platform text DEFAULT 'android')
RETURNS TABLE (
    out_version text,
    out_build_number integer,
    out_download_url text,
    out_release_notes text,
    out_is_mandatory boolean,
    out_min_supported_version text,
    out_file_size_mb numeric
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT version, build_number, download_url, release_notes, is_mandatory, min_supported_version, file_size_mb
    FROM app_versions
    WHERE platform = p_platform AND is_active = true
    ORDER BY build_number DESC
    LIMIT 1;
$$;

-- 4. Accorder l'accès à la fonction
GRANT EXECUTE ON FUNCTION get_latest_app_version TO anon, authenticated;

-- ================================================================
-- COMMENT UTILISER :
-- ================================================================
-- 
-- Quand tu build un nouvel APK :
-- 1. Change la version dans pubspec.yaml (ex: 3.9.0+48)
-- 2. Build: flutter build apk --split-per-abi --release
-- 3. Upload l'APK arm64-v8a dans Supabase Storage (bucket "apk")
-- 4. Insère la nouvelle version :
--
-- INSERT INTO app_versions (version, build_number, download_url, release_notes, is_mandatory, file_size_mb)
-- VALUES (
--     '3.9.0',
--     48,
--     'https://lqrulgkavtzummbsxsok.supabase.co/storage/v1/object/public/apk/checksfleet-3.9.0-arm64.apk',
--     'Nouveautés :\n• Partage de localisation en temps réel\n• Correction de bugs\n• Performances améliorées',
--     false,
--     78.0
-- );
--
-- 5. Désactiver l'ancienne version :
-- UPDATE app_versions SET is_active = false WHERE build_number < 48;
--
-- ================================================================
-- CRÉER LE BUCKET SUPABASE STORAGE :
-- ================================================================
-- 
-- Dans Supabase Dashboard > Storage :
-- 1. Créer un bucket "apk" (cocher "Public bucket")
-- 2. Uploader les fichiers APK dedans
-- 3. L'URL sera : https://lqrulgkavtzummbsxsok.supabase.co/storage/v1/object/public/apk/<nom-fichier>.apk
--
