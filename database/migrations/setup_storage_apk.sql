-- ============================================
-- Configuration Supabase Storage pour APK
-- VERSION SIMPLE - Sans erreurs si déjà existant
-- ============================================

-- 1. Créer le bucket pour les applications mobiles (si n'existe pas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mobile-apps', 'mobile-apps', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- Vérification
-- ============================================

-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE id = 'mobile-apps';

-- ============================================
-- INSTRUCTIONS D'UPLOAD
-- ============================================
-- 1. Aller sur : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/storage
-- 2. Cliquer sur le bucket "mobile-apps"
-- 3. Uploader le fichier : c:\Users\mahdi\Documents\Finality-okok\public\xcrackz.apk
-- 4. L'URL finale sera :
--    https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/mobile-apps/xcrackz.apk
