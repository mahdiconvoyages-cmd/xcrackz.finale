-- ================================================================
-- Système de mise à jour automatique de l'APK (OTA Update)
-- Compatible avec AdminApk (web) + UpdateService (Flutter)
-- Exécuter dans le SQL Editor de Supabase Dashboard
-- ================================================================

-- 1. Supprimer et recréer la table proprement
DROP TABLE IF EXISTS app_versions CASCADE;

CREATE TABLE public.app_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    version_name text NOT NULL,                     -- Ex: '3.9.0'
    version_code integer NOT NULL,                  -- Ex: 48 (correspond au +XX dans pubspec.yaml)
    apk_url text NOT NULL,                          -- URL de téléchargement de l'APK
    release_notes text,                             -- Notes de mise à jour (affiché à l'utilisateur)
    is_mandatory boolean DEFAULT false,             -- Si true, l'utilisateur ne peut pas ignorer
    platform text DEFAULT 'android' NOT NULL,       -- 'android' ou 'ios'
    min_supported_version text,                     -- Version minimale supportée (force la MAJ si en dessous)
    file_size bigint DEFAULT 0,                     -- Taille du fichier en bytes
    download_count integer DEFAULT 0,               -- Nombre de téléchargements
    uploaded_by uuid REFERENCES auth.users(id),     -- Admin qui a uploadé
    created_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true                  -- Seule la version active est proposée
);

-- Index pour récupérer rapidement la dernière version active
CREATE INDEX idx_app_versions_active ON app_versions (platform, is_active, version_code DESC);

-- Commentaire
COMMENT ON TABLE app_versions IS 'Versions de l''application pour mise à jour OTA (sans Google Play)';

-- 2. RLS Policies - lecture publique, écriture admin uniquement
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les versions (nécessaire pour vérifier les MAJ)
CREATE POLICY "app_versions_read_all" ON app_versions
    FOR SELECT USING (true);

-- Seuls les admins peuvent insérer/modifier/supprimer
CREATE POLICY "app_versions_admin_insert" ON app_versions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR app_role IN ('admin', 'super_admin')))
    );

CREATE POLICY "app_versions_admin_update" ON app_versions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR app_role IN ('admin', 'super_admin')))
    );

CREATE POLICY "app_versions_admin_delete" ON app_versions
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR app_role IN ('admin', 'super_admin')))
    );

-- 3. Fonction RPC pour l'app Flutter (retourne la dernière version active)
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
    SELECT 
        version_name,
        version_code,
        apk_url,
        release_notes,
        is_mandatory,
        min_supported_version,
        ROUND(file_size::numeric / (1024 * 1024), 2)
    FROM app_versions
    WHERE platform = p_platform AND is_active = true
    ORDER BY version_code DESC
    LIMIT 1;
$$;

-- 4. Accorder l'accès aux fonctions
GRANT EXECUTE ON FUNCTION get_latest_app_version TO anon, authenticated;

-- ================================================================
-- UTILISATION :
-- ================================================================
-- 
-- L'upload et la gestion des versions se fait depuis l'admin web :
--   Admin > Versions APK
-- 
-- L'admin web upload l'APK dans Supabase Storage (bucket "apk-files"),
-- insère la ligne dans app_versions, et peut envoyer une notification
-- push à tous les utilisateurs.
--
-- ================================================================
-- CRÉER LE BUCKET SUPABASE STORAGE :
-- ================================================================
-- 
-- Dans Supabase Dashboard > Storage :
-- 1. Créer un bucket "apk-files" (cocher "Public bucket")
-- 2. Les fichiers APK seront uploadés via l'admin web
--
