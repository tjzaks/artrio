-- Check what data exists for tobyszaks account
-- Run this to see what's actually in the database

-- 1. Check profile data
SELECT 
  'Profile Data' as section,
  user_id,
  username,
  phone_number,
  personality_type,
  vibes,
  friend_type,
  excited_about,
  conversation_style,
  chat_time,
  created_at
FROM profiles 
WHERE username = 'tobyszaks';

-- 2. Check sensitive data
SELECT 
  'Sensitive Data' as section,
  user_id,
  birthday,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, birthday)) as calculated_age
FROM sensitive_user_data s
JOIN profiles p ON p.user_id = s.user_id
WHERE p.username = 'tobyszaks';

-- 3. Check auth user data (this might fail if not admin)
SELECT 
  'Auth Data' as section,
  id as user_id,
  email,
  raw_user_meta_data,
  last_sign_in_at
FROM auth.users 
WHERE id = (SELECT user_id FROM profiles WHERE username = 'tobyszaks');

-- 4. Test admin function (must be run as admin)
SELECT admin_get_user_email((SELECT user_id FROM profiles WHERE username = 'tobyszaks')) as admin_email_result;

SELECT admin_get_sensitive_data((SELECT user_id FROM profiles WHERE username = 'tobyszaks')) as admin_sensitive_result;