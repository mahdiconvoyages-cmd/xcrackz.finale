-- ============================================
-- MISE À JOUR POLITIQUES RLS POUR AUTO_RENEW
-- ============================================

-- 1. Recréer les politiques SELECT pour subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;

CREATE POLICY "Users can view own subscription"
ON subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Recréer les politiques UPDATE pour subscriptions
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;

CREATE POLICY "Users can update own subscription"
ON subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Politique admin pour tout voir/modifier
DROP POLICY IF EXISTS "Admin full access to subscriptions" ON subscriptions;

CREATE POLICY "Admin full access to subscriptions"
ON subscriptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 4. Vérifier que RLS est activé
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Vérifier les colonnes de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

-- 6. Test : Récupérer une subscription avec auto_renew
SELECT 
    id,
    user_id,
    plan,
    status,
    auto_renew,
    current_period_end
FROM subscriptions
WHERE status = 'active'
LIMIT 1;
