-- Vérifier les descriptions des packages
SELECT 
  id,
  name,
  description,
  credits,
  price,
  billing_period
FROM credits_packages
WHERE is_active = true
ORDER BY price ASC;

-- Mettre à jour les descriptions
UPDATE credits_packages
SET description = 'Accès complet à la plateforme'
WHERE description LIKE '%gratuit%' OR description LIKE '%Tracking GPS%' OR description LIKE '%convoyeurs%';

-- Vérifier après modification
SELECT 
  id,
  name,
  description,
  credits,
  price
FROM credits_packages
WHERE is_active = true
ORDER BY price ASC;
