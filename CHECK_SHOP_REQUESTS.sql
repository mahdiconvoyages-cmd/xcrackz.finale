-- Vérifier toutes les demandes shop_quote_requests
SELECT 
  id,
  company_name,
  email,
  phone,
  expected_volume,
  status,
  package_id,
  created_at,
  user_id
FROM shop_quote_requests
ORDER BY created_at DESC
LIMIT 20;

-- Compter par statut
SELECT 
  status,
  COUNT(*) as count
FROM shop_quote_requests
GROUP BY status;

-- Vérifier les demandes récentes (dernières 24h)
SELECT 
  id,
  company_name,
  email,
  expected_volume,
  status,
  created_at
FROM shop_quote_requests
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
