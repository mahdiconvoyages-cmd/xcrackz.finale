-- =====================================================
-- Test de création d'invoice depuis l'app
-- =====================================================

-- 1. VÉRIFIER LES POLICIES RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'invoices'
ORDER BY policyname;

-- 2. VÉRIFIER LES POLICIES SUR invoice_items
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'invoice_items'
ORDER BY policyname;

-- 3. TEST D'INSERTION MANUEL (simuler l'app)
-- Remplacez 'YOUR_USER_ID' par votre vrai user_id
/*
INSERT INTO invoices (
  user_id,
  invoice_number,
  invoice_date,
  due_date,
  status,
  subtotal,
  tax_rate,
  tax_amount,
  total,
  client_info
) VALUES (
  'YOUR_USER_ID'::uuid,
  'TEST-2025-9999',
  CURRENT_DATE,
  CURRENT_DATE + interval '30 days',
  'draft',
  100.00,
  20.0,
  20.00,
  120.00,
  '{"name": "Test Client", "email": "test@test.com", "phone": "0612345678"}'::jsonb
)
RETURNING id;
*/

-- 4. VÉRIFIER QUE L'INSERT A FONCTIONNÉ
SELECT 
    id,
    user_id,
    invoice_number,
    invoice_date,
    status,
    total,
    client_info->>'name' as client_name,
    client_info->>'email' as client_email
FROM invoices 
WHERE invoice_number LIKE 'TEST%'
ORDER BY created_at DESC
LIMIT 5;
