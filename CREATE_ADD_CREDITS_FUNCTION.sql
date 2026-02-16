-- ============================================
-- FONCTION ADD_CREDITS
-- ============================================
-- Fonction pour ajouter des crédits à un utilisateur
-- Utilisée par le panel admin et d'autres systèmes

-- Supprimer l'ancienne version si elle existe
DROP FUNCTION IF EXISTS add_credits(uuid, integer, text);

CREATE OR REPLACE FUNCTION add_credits(
    p_user_id uuid,
    p_amount integer,
    p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance integer;
BEGIN
    -- Validation
    IF p_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Le montant doit être positif'
        );
    END IF;
    
    -- Ajouter les crédits dans profiles (source unique de vérité)
    UPDATE profiles
    SET credits = COALESCE(credits, 0) + p_amount
    WHERE id = p_user_id
    RETURNING credits INTO v_new_balance;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Utilisateur non trouvé'
        );
    END IF;
    
    -- Synchroniser user_credits (pour compatibilité)
    INSERT INTO user_credits (user_id, balance, total_earned)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        balance = user_credits.balance + p_amount,
        total_earned = user_credits.total_earned + p_amount,
        updated_at = NOW();
    
    -- Log l'opération (si table credits_transactions existe)
    BEGIN
        INSERT INTO credits_transactions (
            user_id,
            amount,
            type,
            description,
            created_at
        ) VALUES (
            p_user_id,
            p_amount,
            'admin_grant',
            COALESCE(p_description, 'Crédits ajoutés par admin'),
            NOW()
        );
    EXCEPTION
        WHEN undefined_table THEN
            -- Table n'existe pas, on ignore
            NULL;
    END;
    
    RETURN json_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'amount_added', p_amount
    );
END;
$$;

COMMENT ON FUNCTION add_credits(uuid, integer, text) IS 'Ajoute des crédits à un utilisateur (admin ou système)';

-- Test de la fonction
DO $$
DECLARE
    v_test_result json;
BEGIN
    RAISE NOTICE 'Fonction add_credits créée avec succès';
    RAISE NOTICE 'Usage: SELECT add_credits(''user_uuid'', 50, ''Bonus de bienvenue'');';
END $$;
