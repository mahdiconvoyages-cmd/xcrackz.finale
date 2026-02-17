-- ============================================
-- Atomic Credit Spend Function
-- Prevents race conditions on credit deductions
-- ============================================

-- Function: spend_credits_atomic
-- Uses row-level locking (SELECT FOR UPDATE) to prevent concurrent reads
CREATE OR REPLACE FUNCTION spend_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the row and get current credits atomically
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_credits IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Utilisateur non trouvé');
  END IF;

  IF v_current_credits < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Crédits insuffisants',
      'current_credits', v_current_credits,
      'requested', p_amount
    );
  END IF;

  v_new_balance := v_current_credits - p_amount;

  -- Update credits
  UPDATE profiles
  SET credits = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Create transaction record
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_type, reference_id, balance_after)
  VALUES (p_user_id, -p_amount, 'deduction', p_description, p_reference_type, p_reference_id, v_new_balance);

  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount_spent', p_amount
  );
END;
$$;

-- Function: add_credits_atomic (also secured for consistency)
CREATE OR REPLACE FUNCTION add_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_transaction_type TEXT DEFAULT 'credit',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_credits IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Utilisateur non trouvé');
  END IF;

  v_new_balance := v_current_credits + p_amount;

  UPDATE profiles
  SET credits = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_type, reference_id, balance_after)
  VALUES (p_user_id, p_amount, p_transaction_type, p_description, p_reference_type, p_reference_id, v_new_balance);

  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount_added', p_amount
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION spend_credits_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION add_credits_atomic TO authenticated;
