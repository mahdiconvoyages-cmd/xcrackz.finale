-- ==========================================
-- 🔍 FIND YOUR USER ID
-- ==========================================

-- Show all users with their emails and mission counts
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  p.is_admin,
  COUNT(m.id) as mission_count,
  MAX(m.created_at) as last_mission_date
FROM profiles p
LEFT JOIN missions m ON m.user_id = p.id
GROUP BY p.id, p.email, p.full_name, p.is_admin
ORDER BY mission_count DESC, last_mission_date DESC NULLS LAST
LIMIT 10;

-- Show which user owns most documents
SELECT 
  id.user_id,
  p.email,
  p.full_name,
  COUNT(*) as document_count
FROM inspection_documents id
LEFT JOIN profiles p ON p.id = id.user_id
WHERE id.user_id IS NOT NULL
GROUP BY id.user_id, p.email, p.full_name
ORDER BY document_count DESC;
