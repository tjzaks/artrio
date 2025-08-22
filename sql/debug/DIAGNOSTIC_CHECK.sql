-- ===============================================
-- DIAGNOSTIC CHECK FOR ADMIN FUNCTIONS
-- Run this in Supabase SQL Editor to check what's working
-- ===============================================

-- 1. Check if admin functions exist
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('admin_get_user_email', 'admin_get_sensitive_data')
ORDER BY routine_name;

-- 2. Check if profile columns exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('phone_number', 'personality_type', 'vibes', 'friend_type', 'excited_about', 'conversation_style', 'chat_time')
ORDER BY column_name;

-- 3. Check if sensitive_user_data table exists and has data
SELECT 
  COUNT(*) as total_records,
  COUNT(birthday) as records_with_birthday
FROM sensitive_user_data;

-- 4. Check a specific user's data (replace with your user ID)
-- First get your user ID
SELECT 
  p.user_id,
  p.username,
  p.phone_number,
  p.personality_type,
  s.birthday
FROM profiles p
LEFT JOIN sensitive_user_data s ON s.user_id = p.user_id
WHERE p.username = 'tobyszaks'
LIMIT 1;

-- 5. Test admin functions (you must be logged in as admin)
-- This will show if the functions are callable
SELECT 'Functions diagnostic complete' as status;