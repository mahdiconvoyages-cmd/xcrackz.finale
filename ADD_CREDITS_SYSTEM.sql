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
-- Drop & recreate to avoid parameter rename conflict
DROP FUNCTION IF EXISTS deduct_credits(UUID, INTEGER, TEXT);
CREATE FUNCTION deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_balance INTEGER;
BEGIN
    SELECT credits INTO v_current_credits
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_credits < p_amount THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Crédits insuffisants',
            'current_credits', v_current_credits,
            'required', p_amount
        );
    END IF;

    UPDATE profiles
    SET credits = credits - p_amount
    WHERE id = p_user_id
    RETURNING credits INTO v_new_balance;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions') THEN
        INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, reference_id, reference_type, created_at)
        VALUES (p_user_id, 'deduction', -p_amount, v_new_balance, p_description, NULL, NULL, NOW());
    END IF;

    RETURN json_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'deducted', p_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_credits(UUID, INTEGER, TEXT) TO authenticated;

-- 5. Créer fonction pour ajouter des crédits (recharge)
DROP FUNCTION IF EXISTS add_credits(UUID, INTEGER, TEXT);
CREATE FUNCTION add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE profiles
    SET credits = credits + p_amount
    WHERE id = p_user_id
    RETURNING credits INTO v_new_balance;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions') THEN
        INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, reference_id, reference_type, created_at)
        VALUES (p_user_id, 'addition', p_amount, v_new_balance, p_description, NULL, NULL, NOW());
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
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('addition','deduction')),
    amount INTEGER NOT NULL,
    balance_after INTEGER,
    description TEXT NOT NULL,
    reference_id UUID,
    reference_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS balance_after INTEGER;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS reference_type TEXT;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_date ON credit_transactions(created_at DESC);

-- Activer RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: utilisateur peut voir ses propres transactions
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
CREATE POLICY "Users can view own credit transactions"
ON credit_transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Fonction admin: ajustement par email et delta
DROP FUNCTION IF EXISTS admin_adjust_credits(TEXT, INTEGER, TEXT, UUID, TEXT);
CREATE FUNCTION admin_adjust_credits(
    p_email TEXT,
    p_delta INTEGER,
    p_description TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_current INTEGER;
    v_new INTEGER;
    v_type TEXT;
BEGIN
    -- Recherche case-insensitive dans profiles, puis fallback sur auth.users
    SELECT id INTO v_user_id FROM profiles WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Utilisateur introuvable');
    END IF;

    -- Verrouiller la ligne profil; si absente, renvoyer erreur explicite
    SELECT credits INTO v_current FROM profiles WHERE id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Profil inexistant pour cet utilisateur');
    END IF;

    v_new := v_current + p_delta;
    IF v_new < 0 THEN
        RETURN json_build_object('success', false, 'error', 'Crédits insuffisants', 'current', v_current, 'delta', p_delta);
    END IF;

    UPDATE profiles SET credits = v_new WHERE id = v_user_id;
    v_type := CASE WHEN p_delta >= 0 THEN 'addition' ELSE 'deduction' END;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions') THEN
        INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, reference_id, reference_type, created_at)
        VALUES (v_user_id, v_type, p_delta, v_new, p_description, p_reference_id, p_reference_type, NOW());
    END IF;

    RETURN json_build_object('success', true, 'email', trim(p_email), 'new_balance', v_new, 'delta', p_delta, 'transaction_type', v_type);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_adjust_credits(TEXT, INTEGER, TEXT, UUID, TEXT) TO authenticated;

-- Variante par user_id (évite la recherche par email)
DROP FUNCTION IF EXISTS admin_adjust_credits_by_user_id(UUID, INTEGER, TEXT, UUID, TEXT);
CREATE FUNCTION admin_adjust_credits_by_user_id(
    p_user_id UUID,
    p_delta INTEGER,
    p_description TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current INTEGER;
    v_new INTEGER;
    v_type TEXT;
BEGIN
    SELECT credits INTO v_current FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Profil inexistant pour cet utilisateur');
    END IF;

    v_new := v_current + p_delta;
    IF v_new < 0 THEN
        RETURN json_build_object('success', false, 'error', 'Crédits insuffisants', 'current', v_current, 'delta', p_delta);
    END IF;

    UPDATE profiles SET credits = v_new WHERE id = p_user_id;
    v_type := CASE WHEN p_delta >= 0 THEN 'addition' ELSE 'deduction' END;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions') THEN
        INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, reference_id, reference_type, created_at)
        VALUES (p_user_id, v_type, p_delta, v_new, p_description, p_reference_id, p_reference_type, NOW());
    END IF;

    RETURN json_build_object('success', true, 'user_id', p_user_id, 'new_balance', v_new, 'delta', p_delta, 'transaction_type', v_type);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_adjust_credits_by_user_id(UUID, INTEGER, TEXT, UUID, TEXT) TO authenticated;

-- ============================================
-- TESTS
-- ============================================
-- SELECT deduct_credits('user-uuid', 1, 'Création mission');
-- SELECT add_credits('user-uuid', 10, 'Achat boutique');
-- SELECT credits FROM profiles WHERE id = 'user-uuid';
