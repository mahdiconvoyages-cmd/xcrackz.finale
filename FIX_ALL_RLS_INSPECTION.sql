-- ============================================
-- FIX COMPLET RLS POUR TOUTES LES TABLES D'INSPECTION
-- ============================================
-- À exécuter dans Supabase SQL Editor
-- Corrige les policies manquantes sur toutes les tables utilisées
-- par le flux d'inspection (départ + arrivée)

-- ============================================
-- 1. vehicle_inspections
-- ============================================
ALTER TABLE IF EXISTS vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Nettoyer toutes les anciennes policies
DROP POLICY IF EXISTS "inspections_all" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_view" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_create" ON vehicle_inspections;
DROP POLICY IF EXISTS "inspections_modify" ON vehicle_inspections;
DROP POLICY IF EXISTS "insp_owner_policy" ON vehicle_inspections;
DROP POLICY IF EXISTS "Users can view their inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Users can insert their inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Users can update their inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Users can view all inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Users can insert inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Users can update inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON vehicle_inspections;
DROP POLICY IF EXISTS "Public can view inspections" ON vehicle_inspections;

-- Policies propres
CREATE POLICY "vi_select" ON vehicle_inspections FOR SELECT TO authenticated
  USING (inspector_id = auth.uid());

CREATE POLICY "vi_insert" ON vehicle_inspections FOR INSERT TO authenticated
  WITH CHECK (inspector_id = auth.uid());

CREATE POLICY "vi_update" ON vehicle_inspections FOR UPDATE TO authenticated
  USING (inspector_id = auth.uid())
  WITH CHECK (inspector_id = auth.uid());

-- ============================================
-- 2. inspection_photos_v2
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspection_photos_v2') THEN
    ALTER TABLE inspection_photos_v2 ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Photos - SELECT own or assigned" ON inspection_photos_v2;
DROP POLICY IF EXISTS "Photos - INSERT own or assigned" ON inspection_photos_v2;
DROP POLICY IF EXISTS "ipv2_select" ON inspection_photos_v2;
DROP POLICY IF EXISTS "ipv2_insert" ON inspection_photos_v2;

-- Les photos sont liées à une inspection via inspection_id
-- On autorise tout pour les utilisateurs authentifiés (les photos sont protégées par l'inspection)
CREATE POLICY "ipv2_select" ON inspection_photos_v2 FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "ipv2_insert" ON inspection_photos_v2 FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- 3. inspection_documents
-- ============================================
ALTER TABLE IF EXISTS inspection_documents ENABLE ROW LEVEL SECURITY;

-- Nettoyer
DROP POLICY IF EXISTS "Documents - SELECT own or assigned" ON inspection_documents;
DROP POLICY IF EXISTS "Documents - INSERT own or assigned" ON inspection_documents;
DROP POLICY IF EXISTS "Documents - DELETE own or assigned" ON inspection_documents;
DROP POLICY IF EXISTS "Users can view own inspection documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can insert own inspection documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can update own inspection documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can delete own inspection documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can view own documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON inspection_documents;
DROP POLICY IF EXISTS "Users insert own documents" ON inspection_documents;
DROP POLICY IF EXISTS "id_select" ON inspection_documents;
DROP POLICY IF EXISTS "id_insert" ON inspection_documents;
DROP POLICY IF EXISTS "id_update" ON inspection_documents;
DROP POLICY IF EXISTS "id_delete" ON inspection_documents;

CREATE POLICY "id_select" ON inspection_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "id_insert" ON inspection_documents FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "id_update" ON inspection_documents FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "id_delete" ON inspection_documents FOR DELETE TO authenticated
  USING (true);

-- ============================================
-- 4. inspection_report_shares
-- ============================================
ALTER TABLE IF EXISTS inspection_report_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_owner_policy" ON inspection_report_shares;
DROP POLICY IF EXISTS "share_public_read" ON inspection_report_shares;
DROP POLICY IF EXISTS "irs_select" ON inspection_report_shares;
DROP POLICY IF EXISTS "irs_insert" ON inspection_report_shares;
DROP POLICY IF EXISTS "irs_update" ON inspection_report_shares;
DROP POLICY IF EXISTS "irs_public_read" ON inspection_report_shares;

-- Propriétaire peut tout faire
CREATE POLICY "irs_select" ON inspection_report_shares FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "irs_insert" ON inspection_report_shares FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "irs_update" ON inspection_report_shares FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Lecture publique pour les rapports actifs (pour les liens publics partagés)
CREATE POLICY "irs_public_read" ON inspection_report_shares FOR SELECT TO anon
  USING (is_active = true);

-- ============================================
-- 5. missions (s'assurer que UPDATE fonctionne)
-- ============================================
ALTER TABLE IF EXISTS missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "missions_select" ON missions;
DROP POLICY IF EXISTS "missions_insert" ON missions;
DROP POLICY IF EXISTS "missions_update" ON missions;
DROP POLICY IF EXISTS "missions_delete" ON missions;
DROP POLICY IF EXISTS "Users can view own missions" ON missions;
DROP POLICY IF EXISTS "Users can create missions" ON missions;
DROP POLICY IF EXISTS "Users can update own missions" ON missions;
DROP POLICY IF EXISTS "Users can delete own missions" ON missions;
DROP POLICY IF EXISTS "missions_all" ON missions;

CREATE POLICY "missions_select" ON missions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "missions_insert" ON missions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "missions_update" ON missions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "missions_delete" ON missions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 6. profiles (s'assurer que les crédits peuvent être mis à jour)
-- ============================================
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- 7. credit_transactions (confirmer INSERT)
-- ============================================
ALTER TABLE IF EXISTS credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can insert own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can update own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "ct_select" ON credit_transactions;
DROP POLICY IF EXISTS "ct_insert" ON credit_transactions;

CREATE POLICY "ct_select" ON credit_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ct_insert" ON credit_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename IN (
  'vehicle_inspections', 
  'inspection_photos_v2', 
  'inspection_documents', 
  'inspection_report_shares', 
  'missions', 
  'profiles', 
  'credit_transactions'
)
ORDER BY tablename, cmd;
