-- Voir toutes les assignations avec détails
SELECT 
  ma.id,
  ma.contact_id,
  c.name as contact_name,
  c.user_id as contact_belongs_to_user,
  u.email as user_qui_doit_recevoir,
  m.reference as mission_reference,
  ma.created_at
FROM mission_assignments ma
JOIN contacts c ON ma.contact_id = c.id
LEFT JOIN auth.users u ON c.user_id = u.id
JOIN missions m ON ma.mission_id = m.id
ORDER BY ma.created_at DESC;
