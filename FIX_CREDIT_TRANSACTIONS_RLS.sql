-- ============================================
-- FIX RLS: Permettre aux utilisateurs d'insérer leurs propres credit_transactions
-- ============================================
-- Problème: RLS activé mais seule une policy SELECT existe
-- L'app Flutter fait des INSERT directs qui sont bloqués (code 42501)

-- 1. Policy INSERT: un utilisateur peut insérer ses propres transactions
DROP POLICY IF EXISTS "Users can insert own credit transactions" ON credit_transactions;
CREATE POLICY "Users can insert own credit transactions"
ON credit_transactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2. Policy UPDATE: un utilisateur peut mettre à jour ses propres transactions (si besoin)
DROP POLICY IF EXISTS "Users can update own credit transactions" ON credit_transactions;
CREATE POLICY "Users can update own credit transactions"
ON credit_transactions FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Vérification
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'credit_transactions';
