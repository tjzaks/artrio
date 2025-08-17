-- Check for existing users and profiles
-- Run these queries one by one in Supabase SQL Editor

-- 1. Check how many profiles exist
SELECT COUNT(*) as profile_count FROM profiles;

-- 2. Check what profiles we have
SELECT id, username, email, created_at FROM profiles LIMIT 10;

-- 3. Check auth users (if you have access)
SELECT COUNT(*) as auth_count FROM auth.users;

-- 4. Look for our dummy users specifically
SELECT * FROM profiles WHERE username LIKE '%emma%' OR username LIKE '%alex%' OR username LIKE '%maya%';

-- 5. Check if profiles table has the right structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;