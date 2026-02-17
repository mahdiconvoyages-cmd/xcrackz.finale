-- ============================================================
-- FIX DÉFINITIF : RLS missions pour voir les missions assignées
-- 
-- PROBLÈME : Le chauffeur rejoint une mission (claim_mission OK, 
--            SECURITY DEFINER bypass RLS) mais ne peut PAS la voir
--            car la policy SELECT ne vérifie que user_id = auth.uid()
--            et pas assigned_to_user_id = auth.uid()
--
-- EXÉCUTER DANS : Supabase SQL Editor
-- ============================================================

-- 1. Activer RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les anciennes policies conflictuelles
DROP POLICY IF EXISTS "missions_select" ON public.missions;
DROP POLICY IF EXISTS "missions_insert" ON public.missions;
DROP POLICY IF EXISTS "missions_update" ON public.missions;
DROP POLICY IF EXISTS "missions_delete" ON public.missions;
DROP POLICY IF EXISTS "missions_all" ON public.missions;
DROP POLICY IF EXISTS "Users can view own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can create missions" ON public.missions;
DROP POLICY IF EXISTS "Users can update own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can delete own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can view all missions" ON public.missions;
DROP POLICY IF EXISTS "Users can insert missions" ON public.missions;
DROP POLICY IF EXISTS "Users can update missions" ON public.missions;
DROP POLICY IF EXISTS "Users can read missions assigned to them" ON public.missions;
DROP POLICY IF EXISTS "Users can view created or assigned missions" ON public.missions;
DROP POLICY IF EXISTS "Users can update created or assigned missions" ON public.missions;
DROP POLICY IF EXISTS "missions_remove" ON public.missions;
DROP POLICY IF EXISTS "missions_create" ON public.missions;
DROP POLICY IF EXISTS "missions_convoyeur_close" ON public.missions;

-- 3. SELECT : Voir missions créées OU assignées au chauffeur
CREATE POLICY "missions_select" ON public.missions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR
    auth.uid() = assigned_to_user_id
  );

-- 4. INSERT : Seul le créateur peut insérer
CREATE POLICY "missions_insert" ON public.missions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. UPDATE : Le créateur ET le chauffeur assigné peuvent modifier
CREATE POLICY "missions_update" ON public.missions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR
    auth.uid() = assigned_to_user_id
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    auth.uid() = assigned_to_user_id
  );

-- 6. DELETE : Seul le créateur peut supprimer
CREATE POLICY "missions_delete" ON public.missions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 7. Vérification
SELECT 
  policyname,
  cmd,
  qual::text AS condition,
  with_check::text AS check_condition
FROM pg_policies
WHERE tablename = 'missions'
ORDER BY policyname;

-- ============================================================
-- RÉSULTAT ATTENDU :
-- missions_select  | SELECT | user_id=auth.uid() OR assigned_to_user_id=auth.uid()
-- missions_insert  | INSERT | user_id=auth.uid()
-- missions_update  | UPDATE | user_id=auth.uid() OR assigned_to_user_id=auth.uid()
-- missions_delete  | DELETE | user_id=auth.uid()
-- ============================================================
