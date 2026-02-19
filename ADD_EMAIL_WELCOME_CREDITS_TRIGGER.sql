-- =============================================
-- Trigger: Give 10 welcome credits when email is confirmed
-- Fires on auth.users AFTER UPDATE of email_confirmed_at
-- =============================================

-- Function: give 10 welcome credits when email is confirmed
CREATE OR REPLACE FUNCTION public.on_email_confirmed()
RETURNS trigger AS $$
BEGIN
  -- Only fire when email_confirmed_at changes from NULL to a real timestamp
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Give 10 credits in profiles
    UPDATE public.profiles
    SET credits = COALESCE(credits, 0) + 10
    WHERE id = NEW.id;

    -- Upsert user_credits
    INSERT INTO public.user_credits (user_id, balance, lifetime_earned, lifetime_spent)
    VALUES (NEW.id, 10, 10, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_credits.balance + 10,
        lifetime_earned = public.user_credits.lifetime_earned + 10;

    -- Log credit transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, balance_after)
    VALUES (
      NEW.id,
      10,
      'addition',
      'Cadeau de bienvenue - 10 credits offerts (email verifie)',
      COALESCE((SELECT balance FROM public.user_credits WHERE user_id = NEW.id), 10)
    );

    RAISE LOG 'Welcome credits given to user % after email confirmation', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_email_confirmed_trigger ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_email_confirmed_trigger
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.on_email_confirmed();
