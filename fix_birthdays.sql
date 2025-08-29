-- Fix missing birthdays in sensitive_user_data table
-- This script checks auth.users metadata and populates sensitive_user_data

-- First, let's see what we have in auth.users metadata
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'username' as username,
  u.raw_user_meta_data->>'birthday' as birthday_in_metadata,
  s.birthday as birthday_in_sensitive_data
FROM auth.users u
LEFT JOIN sensitive_user_data s ON s.user_id = u.id
WHERE u.email IN (
  'testbot1@artrio.com',
  'testbot2@artrio.com', 
  'tyler@szakacsmedia.com'
)
ORDER BY u.created_at DESC;

-- Update sensitive_user_data with birthdays from auth metadata
INSERT INTO sensitive_user_data (user_id, birthday)
SELECT 
  u.id,
  (u.raw_user_meta_data->>'birthday')::date
FROM auth.users u
WHERE 
  u.raw_user_meta_data->>'birthday' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sensitive_user_data s 
    WHERE s.user_id = u.id AND s.birthday IS NOT NULL
  )
ON CONFLICT (user_id) 
DO UPDATE SET 
  birthday = EXCLUDED.birthday
WHERE sensitive_user_data.birthday IS NULL;

-- Verify the fix
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'username' as username,
  s.birthday,
  CASE 
    WHEN s.birthday IS NOT NULL THEN 
      TO_CHAR(s.birthday, 'Month DD, YYYY')
    ELSE 'No birthday'
  END as birthday_display
FROM auth.users u
LEFT JOIN sensitive_user_data s ON s.user_id = u.id
ORDER BY u.created_at DESC;