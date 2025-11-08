-- ============================================
-- SYSTÈME DE CRÉDITS
-- Remplace revenue par credits
-- ============================================

-- 1. Ajouter colonne credits si elle n'existe pas déjà
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'credits') THEN
        ALTER TABLE profiles ADD COLUMN credits INTEGER DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Colonne credits ajoutée';
    ELSE
        RAISE NOTICE 'Colonne credits existe déjà';
    END IF;
END $$;

-- 2. Migrer revenue vers credits (si revenue existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'revenue') THEN
        UPDATE profiles SET credits = COALESCE(revenue, 0) WHERE credits = 0;
        RAISE NOTICE 'Revenue migré vers credits';
    END IF;
END $$;

-- 3. Activer Realtime sur table profiles (si pas déjà fait)
DO $$ 
BEGIN
    -- Vérifier si profiles est déjà dans la publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
        RAISE NOTICE 'Realtime activé sur profiles';
    ELSE
        RAISE NOTICE 'Realtime déjà activé sur profiles';
    END IF;
END $$;

-- 4. Créer fonction pour déduire des crédits
CREATE OR REPLACE FUNCTION deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_credits INTEGER;
BEGIN
    -- Récupérer crédits actuels avec verrou
    SELECT credits INTO v_current_credits
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Vérifier si suffisant
    IF v_current_credits < p_amount THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Crédits insuffisants',
            'current_credits', v_current_credits,
            'required', p_amount
        );
    END IF;
    
    -- Déduire
    UPDATE profiles
    SET credits = credits - p_amount
    WHERE id = p_user_id;
    
    -- Log transaction (si table existe)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions') THEN
        INSERT INTO credit_transactions (user_id, amount, type, reason, created_at)
        VALUES (p_user_id, -p_amount, 'deduction', p_reason, NOW());
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'new_balance', v_current_credits - p_amount,
        'deducted', p_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_credits(UUID, INTEGER, TEXT) TO authenticated;

-- 5. Créer fonction pour ajouter des crédits (recharge)
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Ajouter crédits
    UPDATE profiles
    SET credits = credits + p_amount
    WHERE id = p_user_id
    RETURNING credits INTO v_new_balance;
    
    -- Log transaction
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions') THEN
        INSERT INTO credit_transactions (user_id, amount, type, reason, created_at)
        VALUES (p_user_id, p_amount, 'addition', p_reason, NOW());
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'added', p_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION add_credits(UUID, INTEGER, TEXT) TO authenticated;

-- ============================================
-- TARIFICATION
-- ============================================
-- Créer mission: 1 crédit
-- Inspection: gratuit (si mission disponible)
-- Publier covoiturage: 2 crédits
-- Réserver covoiturage: 2 crédits

-- Table optionnelle pour historique
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('addition', 'deduction')),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_date ON credit_transactions(created_at DESC);

-- Activer RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: utilisateur peut voir ses propres transactions
CREATE POLICY "Users can view own credit transactions"
ON credit_transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- TESTS
-- ============================================
-- SELECT deduct_credits('user-uuid', 1, 'Création mission');
-- SELECT add_credits('user-uuid', 10, 'Achat boutique');
-- SELECT credits FROM profiles WHERE id = 'user-uuid';
