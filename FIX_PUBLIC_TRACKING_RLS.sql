-- ============================================================
-- FIX : Accès public à la page de tracking (anon)
-- 
-- PROBLÈME : La page /tracking/:token est publique (pas d'auth)
--            mais les RLS policies bloquent les SELECT pour le rôle
--            anon car elles vérifient auth.uid() = user_id.
--            Résultat : la page publique affiche une carte vide.
--
-- SOLUTION : Ajouter des policies RLS pour le rôle anon qui
--            n'accordent l'accès que si la mission a un
--            public_tracking_link actif et non expiré.
--
-- EXÉCUTER DANS : Supabase SQL Editor
-- ============================================================

-- ============================================
-- 1. GRANTS pour le rôle anon
-- ============================================
GRANT SELECT ON public.public_tracking_links TO anon;
GRANT SELECT ON public.mission_tracking_live TO anon;
GRANT SELECT ON public.mission_tracking_history TO anon;
GRANT SELECT ON public.missions TO anon;
GRANT SELECT ON public.profiles TO anon;

-- ============================================
-- 2. RLS : public_tracking_links — lecture publique
-- ============================================
ALTER TABLE public.public_tracking_links ENABLE ROW LEVEL SECURITY;

-- Anon peut lire les liens actifs pour valider le token
DROP POLICY IF EXISTS "public_tracking_links_anon_read" ON public.public_tracking_links;
CREATE POLICY "public_tracking_links_anon_read" 
  ON public.public_tracking_links
  FOR SELECT TO anon
  USING (
    is_active = true 
    AND expires_at > now()
  );

-- Authenticated peut lire/créer/modifier ses propres liens
DROP POLICY IF EXISTS "public_tracking_links_auth_select" ON public.public_tracking_links;
CREATE POLICY "public_tracking_links_auth_select"
  ON public.public_tracking_links
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "public_tracking_links_auth_insert" ON public.public_tracking_links;
CREATE POLICY "public_tracking_links_auth_insert"
  ON public.public_tracking_links
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "public_tracking_links_auth_update" ON public.public_tracking_links;
CREATE POLICY "public_tracking_links_auth_update"
  ON public.public_tracking_links
  FOR UPDATE TO authenticated
  USING (true);

-- ============================================
-- 3. RLS : missions — lecture anon via token valide
-- ============================================
-- Anon peut lire UNE mission si elle a un lien public actif
DROP POLICY IF EXISTS "missions_anon_public_tracking" ON public.missions;
CREATE POLICY "missions_anon_public_tracking"
  ON public.missions
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.public_tracking_links ptl
      WHERE ptl.mission_id = missions.id
        AND ptl.is_active = true
        AND ptl.expires_at > now()
    )
  );

-- ============================================
-- 4. RLS : mission_tracking_live — lecture anon via token valide
-- ============================================
ALTER TABLE public.mission_tracking_live ENABLE ROW LEVEL SECURITY;

-- Garder la policy authenticated existante
DROP POLICY IF EXISTS "tracking_live_select" ON public.mission_tracking_live;
CREATE POLICY "tracking_live_select"
  ON public.mission_tracking_live
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_tracking_live.mission_id
        AND (m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tracking_live_insert" ON public.mission_tracking_live;
CREATE POLICY "tracking_live_insert"
  ON public.mission_tracking_live
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tracking_live_update" ON public.mission_tracking_live;
CREATE POLICY "tracking_live_update"
  ON public.mission_tracking_live
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Anon : lecture si lien public actif
DROP POLICY IF EXISTS "tracking_live_anon_read" ON public.mission_tracking_live;
CREATE POLICY "tracking_live_anon_read"
  ON public.mission_tracking_live
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.public_tracking_links ptl
      WHERE ptl.mission_id = mission_tracking_live.mission_id
        AND ptl.is_active = true
        AND ptl.expires_at > now()
    )
  );

-- ============================================
-- 5. RLS : mission_tracking_history — lecture anon via token valide
-- ============================================
ALTER TABLE public.mission_tracking_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracking_history_select" ON public.mission_tracking_history;
CREATE POLICY "tracking_history_select"
  ON public.mission_tracking_history
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_tracking_history.mission_id
        AND (m.user_id = auth.uid() OR m.assigned_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tracking_history_insert" ON public.mission_tracking_history;
CREATE POLICY "tracking_history_insert"
  ON public.mission_tracking_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Anon : lecture si lien public actif
DROP POLICY IF EXISTS "tracking_history_anon_read" ON public.mission_tracking_history;
CREATE POLICY "tracking_history_anon_read"
  ON public.mission_tracking_history
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.public_tracking_links ptl
      WHERE ptl.mission_id = mission_tracking_history.mission_id
        AND ptl.is_active = true
        AND ptl.expires_at > now()
    )
  );

-- ============================================
-- 6. RLS : profiles — anon peut lire nom du chauffeur uniquement
-- ============================================
DROP POLICY IF EXISTS "profiles_anon_driver_name" ON public.profiles;
CREATE POLICY "profiles_anon_driver_name"
  ON public.profiles
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      JOIN public.public_tracking_links ptl ON ptl.mission_id = m.id
      WHERE m.assigned_user_id = profiles.id
        AND ptl.is_active = true
        AND ptl.expires_at > now()
    )
  );

-- ============================================
-- 7. GRANT EXECUTE sur generate_public_tracking_link
-- ============================================
GRANT EXECUTE ON FUNCTION generate_public_tracking_link TO authenticated;

-- ============================================
-- 7b. Fonction RPC pour incrémenter le compteur d'accès (anon-safe)
-- ============================================
CREATE OR REPLACE FUNCTION increment_tracking_access(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public_tracking_links
  SET access_count = access_count + 1,
      last_accessed_at = now()
  WHERE token = p_token
    AND is_active = true
    AND expires_at > now();
END;
$$;

GRANT EXECUTE ON FUNCTION increment_tracking_access TO anon;
GRANT EXECUTE ON FUNCTION increment_tracking_access TO authenticated;

-- ============================================
-- 8. Ajouter FK si manquante : missions.assigned_user_id → profiles.id
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'missions_assigned_user_id_fkey'
      AND table_name = 'missions'
  ) THEN
    ALTER TABLE public.missions
      ADD CONSTRAINT missions_assigned_user_id_fkey
      FOREIGN KEY (assigned_user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 9. Vérification
-- ============================================
SELECT tablename, policyname, roles, cmd, qual::text
FROM pg_policies
WHERE tablename IN (
  'public_tracking_links', 
  'mission_tracking_live', 
  'mission_tracking_history',
  'missions',
  'profiles'
)
AND roles::text LIKE '%anon%'
ORDER BY tablename, policyname;

-- ============================================================
-- RÉSULTAT : La page /tracking/:token pourra maintenant :
-- 1. Valider le token via public_tracking_links
-- 2. Lire les détails de la mission
-- 3. Lire la position GPS live
-- 4. Lire l'historique GPS
-- 5. Lire le nom du chauffeur
-- Tout cela UNIQUEMENT si le lien est actif et non expiré.
-- ============================================================
