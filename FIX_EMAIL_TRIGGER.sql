CREATE OR REPLACE FUNCTION public.on_email_confirmed()
RETURNS trigger AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET credits = COALESCE(credits, 0) + 10
    WHERE id = NEW.id;

    INSERT INTO public.user_credits (user_id, balance, total_earned, total_spent)
    VALUES (NEW.id, 10, 10, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_credits.balance + 10,
        total_earned = public.user_credits.total_earned + 10;

    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, balance_after)
    VALUES (
      NEW.id, 10, 'addition',
      'Cadeau de bienvenue - 10 credits offerts (email verifie)',
      COALESCE((SELECT balance FROM public.user_credits WHERE user_id = NEW.id), 10)
    );

    RAISE LOG 'Welcome credits given to user % after email confirmation', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
