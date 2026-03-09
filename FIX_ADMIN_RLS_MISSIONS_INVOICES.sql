-- ============================================================================
-- FIX: Admin RLS policies for missions and invoices
-- Problem: Admin cannot see other users' missions/invoices in admin panel
-- Solution: Add SELECT policies that allow admins to view all records
-- ============================================================================

-- 1) Admin can view ALL missions
CREATE POLICY admin_missions_select ON public.missions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 2) Admin can view ALL invoices
CREATE POLICY admin_invoices_select ON public.invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 3) Admin can view ALL credit_transactions
CREATE POLICY admin_credit_transactions_select ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 4) Admin can view ALL user_credits
CREATE POLICY admin_user_credits_select ON public.user_credits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

SELECT 'Admin RLS policies added for missions, invoices, credit_transactions, user_credits' as result;
