-- Debug tobyszaks account data
-- Run this in Supabase SQL Editor to see what data exists

-- 1. Check profile data
SELECT 
  'Profile Data' as section,
  user_id,
  username,
  email,
  phone_number,
  personality_type,
  vibes,
  friend_type,
  excited_about,
  conversation_style,
  chat_time,
  is_admin,
  created_at
FROM profiles 
WHERE username = 'tobyszaks';

-- 2. Check if sensitive_user_data table exists and has data for this user
SELECT 
  'Sensitive Data' as section,
  user_id,
  birthday,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, birthday)) as calculated_age,
  created_at
FROM sensitive_user_data s
WHERE user_id = (SELECT user_id FROM profiles WHERE username = 'tobyszaks');

-- 3. Check auth.users data (basic info)
SELECT 
  'Auth Users Basic' as section,
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users 
WHERE id = (SELECT user_id FROM profiles WHERE username = 'tobyszaks');

-- 4. Test admin functions
SELECT 'Testing admin functions...' as status;

-- Test if you're an admin
SELECT 
  'Admin Check' as section,
  username,
  is_admin,
  CASE WHEN is_admin THEN 'You are an admin' ELSE 'You are NOT an admin' END as status
FROM profiles 
WHERE user_id = auth.uid();

-- 5. If you are admin, test the functions
SELECT 
  'Admin Email Function Test' as section,
  admin_get_user_email((SELECT user_id FROM profiles WHERE username = 'tobyszaks')) as result;

SELECT 
  'Admin Sensitive Function Test' as section,
  admin_get_sensitive_data((SELECT user_id FROM profiles WHERE username = 'tobyszaks')) as result;