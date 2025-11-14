-- ==========================================
-- 🔧 FIX NULL user_id - Use profile ID directly
-- ==========================================

-- 1. Find YOUR user_id from profiles table
SELECT id, email, full_name 
FROM profiles 
WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
LIMIT 1;

-- 2. Check missions table to find a user_id from your missions
SELECT user_id, COUNT(*) as mission_count
FROM missions
GROUP BY user_id
ORDER BY mission_count DESC
LIMIT 5;

-- 3. OPTION A: Update using your email (SAFEST)
-- ⚠️ REPLACE 'your-email@example.com' with your actual email
/*
UPDATE inspection_documents 
SET user_id = (
  SELECT id FROM profiles WHERE email = 'your-email@example.com' LIMIT 1
),
updated_at = now()
WHERE user_id IS NULL;
*/

-- 4. OPTION B: Update using the most common user_id from missions
-- This assumes these documents belong to whoever has the most missions
UPDATE inspection_documents 
SET user_id = (
  SELECT user_id 
  FROM missions 
  WHERE missions.id = inspection_documents.inspection_id::uuid
    OR missions.id IN (
      SELECT mission_id FROM vehicle_inspections 
      WHERE vehicle_inspections.id = inspection_documents.inspection_id
    )
  LIMIT 1
),
updated_at = now()
WHERE user_id IS NULL;

-- 5. If the above doesn't work, manually set to the most active user
-- UPDATE inspection_documents 
-- SET user_id = 'PASTE-YOUR-UUID-HERE',
--     updated_at = now()
-- WHERE user_id IS NULL;

-- 6. Verify
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_user_id,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as still_null
FROM inspection_documents;

-- 7. Show updated documents
SELECT id, document_title, document_type, user_id 
FROM inspection_documents 
LIMIT 5;
