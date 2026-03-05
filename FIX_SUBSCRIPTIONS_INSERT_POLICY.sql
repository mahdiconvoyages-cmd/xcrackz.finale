-- ============================================================================
-- FIX MINEUR : Ajouter policy INSERT sur subscriptions pour utilisateurs
-- ============================================================================
-- Problème : seuls les admins peuvent INSERT dans subscriptions
-- Le signup fonctionne car handle_new_user est SECURITY DEFINER
-- Mais le fallback Flutter (subscription_service.dart) qui recrée un 
-- abonnement manquant échouerait sans cette policy
-- ============================================================================

-- Ajouter INSERT pour utilisateurs authentifiés (seulement pour leur propre user_id)
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
CREATE POLICY "Users can insert own subscription" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Vérification
SELECT policyname, cmd, roles::text
FROM pg_policies
WHERE tablename = 'subscriptions'
ORDER BY cmd;
