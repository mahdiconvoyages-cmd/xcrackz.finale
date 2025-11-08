-- ============================================
-- DIAGNOSTIC ET FIX CRÉDITS
-- Vérifie où sont les crédits et les migre vers profiles.credits
-- ============================================

-- 1. DIAGNOSTIC : Vérifier les crédits actuels dans profiles
SELECT 
    id, 
    email, 
    credits as credits_actuels,
    blocked_credits,
    COALESCE(credits, 0) + COALESCE(blocked_credits, 0) as total_credits
FROM profiles
WHERE email LIKE '%mahdi%' OR email LIKE '%convoy%'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Vérifier si colonne revenue existe encore
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'revenue') THEN
        RAISE NOTICE 'Colonne revenue existe encore - migration nécessaire';
        
        -- Afficher les revenues
        RAISE NOTICE 'Checking revenue values...';
    ELSE
        RAISE NOTICE 'Colonne revenue n''existe plus';
    END IF;
END $$;

-- 3. Vérifier si table user_credits existe (ancienne table)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'user_credits') THEN
        RAISE NOTICE 'Table user_credits existe encore';
    ELSE
        RAISE NOTICE 'Table user_credits n''existe pas';
    END IF;
END $$;

-- 4. MIGRATION MANUELLE : Mettez à jour VOTRE email ci-dessous
-- Remplacez 'votre-email@example.com' par votre vrai email
UPDATE profiles 
SET credits = 1400 
WHERE email = 'mahdiconvoyages@gmail.com' -- CHANGEZ CETTE VALEUR SI NÉCESSAIRE
RETURNING id, email, credits;

-- 5. Vérifier le résultat
SELECT 
    id,
    email,
    credits,
    blocked_credits,
    created_at
FROM profiles
WHERE email = 'mahdiconvoyages@gmail.com' -- CHANGEZ CETTE VALEUR SI NÉCESSAIRE
LIMIT 1;

-- 6. Log dans credit_transactions
INSERT INTO credit_transactions (user_id, amount, type, reason, created_at)
SELECT 
    id,
    1400,
    'addition',
    'Migration manuelle des crédits vers nouvelle colonne',
    NOW()
FROM profiles
WHERE email = 'mahdiconvoyages@gmail.com' -- CHANGEZ CETTE VALEUR SI NÉCESSAIRE
ON CONFLICT DO NOTHING;

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================
SELECT 
    'Profiles avec crédits' as table_name,
    COUNT(*) as total,
    SUM(credits) as total_credits,
    AVG(credits) as avg_credits
FROM profiles
WHERE credits > 0;

SELECT 
    'Transactions crédits' as table_name,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN type = 'addition' THEN amount ELSE 0 END) as total_additions,
    SUM(CASE WHEN type = 'deduction' THEN ABS(amount) ELSE 0 END) as total_deductions
FROM credit_transactions;
